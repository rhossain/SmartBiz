/* SmartBiz BD — language + numeral layer.
   Bangla is the default and is written first everywhere: L(bangla, english).
   Numerals convert too — a Bangla-first product that renders 1,250 in Latin
   digits is only half translated. */

window.App = window.App || {};

(function (App) {
  'use strict';

  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  App.lang = 'bn';

  /* pick a string for the active language */
  function L(bn, en) {
    return App.lang === 'bn' ? bn : (en === undefined ? bn : en);
  }

  /* digits → Bangla digits when Bangla is active */
  function bnDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  /* integer/decimal with thousands separators, localised numerals */
  function n(value, decimals) {
    var num = Number(value) || 0;
    var neg = num < 0;
    num = Math.abs(num);
    var fixed = decimals ? num.toFixed(decimals) : Math.round(num).toString();
    var parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var out = parts.join('.');
    if (App.lang === 'bn') out = bnDigits(out);
    return (neg ? '−' : '') + out;
  }

  /* A counted noun. Bangla does not inflect these, so it takes one suffix;
     English needs both forms, because "1 items" reads as a bug. */
  function unit(count, bn, one, many) {
    return L(n(count) + bn, n(count) + ' ' + (count === 1 ? one : many));
  }

  /* money — currency mark is a separate span so it can be de-emphasised */
  function tk(value, decimals) {
    return '<span class="cur">৳</span>' + n(value, decimals);
  }

  /* plain-text money, for attributes and aria labels */
  function tkPlain(value, decimals) {
    return '৳' + n(value, decimals);
  }

  var MONTHS_BN = ['জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
  var MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* 'YYYY-MM-DD HH:MM' → 'বিকাল ৫:৫৫' / '5:55 PM'.
     Bangla names the part of day rather than using AM/PM, and the split points
     are the everyday ones — সন্ধ্যা begins around dusk, not at midnight. */
  function time(iso) {
    var t = (String(iso).split(' ')[1] || '').split(':');
    if (t.length < 2) return '';
    var h = +t[0];
    if (App.lang === 'bn') {
      var ap = h < 6 ? 'রাত' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর'
        : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
      return ap + ' ' + n(h % 12 || 12) + ':' + bnDigits(t[1]);
    }
    return n(h % 12 || 12) + ':' + t[1] + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  /* 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM' → '৭ সেপ্ট' / '7 Sep' */
  function date(iso, withTime) {
    if (!iso) return '—';
    var d = iso.split(' ')[0].split('-');
    var mi = (+d[1]) - 1;
    var months = App.lang === 'bn' ? MONTHS_BN : MONTHS_EN;
    var out = n(+d[2]) + ' ' + months[mi];
    var t = withTime ? time(iso) : '';
    if (t) out += ', ' + t;
    return out;
  }

  /* '3 দিন আগে' style, computed against the demo's frozen today */
  function ago(iso) {
    var today = App.TODAY || '2026-09-07';
    var a = Date.parse(today.split(' ')[0]);
    var b = Date.parse(iso.split(' ')[0]);
    var days = Math.round((a - b) / 86400000);
    if (days <= 0) return L('আজ', 'today');
    if (days === 1) return L('গতকাল', 'yesterday');
    return L(n(days) + ' দিন আগে', n(days) + 'd ago');
  }

  App.L = L;
  App.n = n;
  App.tk = tk;
  App.tkPlain = tkPlain;
  App.bnDigits = bnDigits;
  App.date = date;
  App.time = time;
  App.unit = unit;
  App.ago = ago;
})(window.App);
