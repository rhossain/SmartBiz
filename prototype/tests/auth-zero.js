/* Authentication, AD-19 recovery, zero-setup, and invitation contract. */
'use strict';

const fs = require('fs');
const path = require('path');
const { boot } = require('./boot');

(async () => {
  const { window, App, doc, ROOT, errors } = await boot();
  const failures = [];
  const nav = route => { window.location.hash = '#/' + route; App.render(); };
  const text = () => doc.getElementById('app').textContent.replace(/\s+/g, ' ').trim();
  const assert = (claim, condition) => { if (!condition) failures.push(claim); };

  App.lang = 'en';
  doc.documentElement.lang = 'en';
  doc.body.dataset.lang = 'en';
  App.device = 'phone';
  doc.body.dataset.device = 'phone';
  App.role = 'owner';
  doc.body.dataset.role = 'owner';

  nav('signin');
  assert('Sign-in does not render.', !!doc.querySelector('.auth'));
  assert('Sign-in must contain identifier and password fields.',
    doc.querySelectorAll('input').length === 2 && !!doc.querySelector('input[type="password"]'));
  assert('Sign-in must link to registration and recovery.',
    !!doc.querySelector('[data-go="register"]') && !!doc.querySelector('[data-go="recovery/reset"]'));

  nav('register');
  assert('Registration must contain identifier, password, and confirmation.',
    doc.querySelectorAll('input').length === 3 && doc.querySelectorAll('input[type="password"]').length === 2);
  assert('Registration must lead to one-time recovery reveal.',
    !!doc.querySelector('[data-go="recovery/reveal"]'));

  nav('recovery/reveal');
  assert('Recovery code reveal must explain show-once handling.',
    /shown only now/i.test(text()) && /stores only a secure hash/i.test(text()));
  assert('Recovery reveal must continue directly to Business creation.',
    !!doc.querySelector('[data-go="setup"]'));

  nav('recovery/reset');
  assert('Reset must request a recovery code and two password fields.',
    /Recovery code/i.test(text()) && doc.querySelectorAll('input[type="password"]').length === 2);
  assert('Reset must issue a replacement code.',
    !!doc.querySelector('[data-go="recovery/replaced"]'));

  nav('recovery/replaced');
  assert('Replacement state must show a new one-time recovery code.',
    /replacement recovery code/i.test(text()) && /shown only now/i.test(text()));

  nav('setup');
  assert('Business creation must be exactly one step.', /One step/i.test(text()));
  assert('Business creation must have name and type fields.',
    doc.getElementById('app').querySelectorAll('input,select').length === 2);
  assert('Business creation must land on the empty Dashboard.',
    !!doc.querySelector('[data-go="home/empty"]'));
  assert('Removed setup wizard steps must not be reachable from Business creation.',
    !doc.querySelector('[data-go^="setup/"]') && !/seed catalogue|invite team|ready/i.test(text()));

  nav('home/empty');
  const empty = doc.querySelector('.zero-dashboard');
  assert('First-run Dashboard must have a dedicated empty state.', !!empty);
  assert('Paste order must be the empty Dashboard primary action.',
    !!empty && !!empty.querySelector('.btn.primary[data-go="capture/paste"]'));
  assert('Empty Dashboard must visibly establish empty core collections.',
    !!empty && /no orders, Products, Customers, or Suppliers yet/i.test(empty.textContent));
  assert('Empty Dashboard must not render seeded operational records.',
    !!empty && !/ORD-|৳|Recent orders|Money With Couriers/i.test(empty.textContent));

  for (const role of ['owner', 'manager']) {
    App.role = role;
    doc.body.dataset.role = role;
    nav('invitations/generate');
    assert(role + ' must reach invitation generation.', !!doc.querySelector('.invitation-generator'));
  }
  const inviteText = text();
  for (const roleName of ['Owner', 'Manager', 'Accountant', 'Inventory Staff', 'Sales Staff']) {
    assert('Invitation generator must include Role: ' + roleName, inviteText.includes(roleName));
  }
  assert('Invitation generation must bind the Role before redemption.', /Role-bound/i.test(inviteText));

  App.role = 'owner';
  doc.body.dataset.role = 'owner';
  nav('invite/redeem');
  assert('Redeem must state that the Role is already assigned.', /Role is already assigned/i.test(text()));
  for (const outcome of ['used', 'expired', 'revoked']) {
    nav('invite/' + outcome);
    assert('Invitation outcome must render distinctly: ' + outcome,
      new RegExp(outcome === 'used' ? 'already used' : outcome, 'i').test(text()));
  }

  const sourceFiles = fs.readdirSync(path.join(ROOT, 'js')).filter(name => name.endsWith('.js'))
    .concat(['index.html']);
  const source = sourceFiles.map(name => fs.readFileSync(
    name === 'index.html' ? path.join(ROOT, name) : path.join(ROOT, 'js', name), 'utf8')).join('\n');
  assert('OTP and passwordless copy/routes must be absent from prototype source.',
    !/(?:\bOTP\b|4-digit|৪ সংখ্যার|no password|data-go=["']verify|App\.screens\.verify)/i.test(source));
  assert('Forced catalogue/team/ready setup routes must be absent from prototype source.',
    !/(?:setup\/catalogue|setup\/team|setup\/done)/.test(source));
  assert('Legacy Staff and Packer Role keys must be absent from prototype source.',
    !/(?:value=["'](?:staff|packer)["']|App\.ROLES\.(?:staff|packer)|role\s*=\s*["'](?:staff|packer)["'])/.test(source));

  if (errors.length) failures.push(...errors);
  if (failures.length) {
    console.error('Auth and zero-setup FAILED (' + failures.length + ')\n- ' + failures.join('\n- '));
    process.exit(1);
  }
  console.log('Auth and zero-setup PASSED — password auth, AD-19 recovery, direct empty Dashboard, and Role-bound invitation states.');
})().catch(error => { console.error(error); process.exit(1); });
