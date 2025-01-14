$(document).ready(function() {
  // premenne
  const $ciastka      = $('#ciastka');
  const $zMenou       = $('#zMenou');
  const $naMenu       = $('#naMenu');
  const $zamenBtn     = $('#zamenBtn');
  const $previestBtn  = $('#previestBtn');
  const $vysledok     = $('#vysledok');
  const $historiaList = $('#historiaList');
  const $prehodPrep   = $('#prehodPrep');
  const $aktualneKurzyTelo= $('#aktualneKurzyTelo');


  const API_KEY = 'c7ff1b178b88dcdaaa5eb7691e144760';

  const oblubeneMeny = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan',
    HKD: 'Hong Kong Dollar',
    NZD: 'New Zealand Dollar',
    SEK: 'Swedish Krona',
    NOK: 'Norwegian Krone',
    DKK: 'Danish Krone',
    PLN: 'Polish Zloty',
    CZK: 'Czech Koruna'
  };

  // zoznam_do_selektu
  function nacitajMeny() {
    const kody = Object.keys(oblubeneMeny).sort();
    kody.forEach(kod => {
      $zMenou.append(`<option value="${kod}">${kod} - ${oblubeneMeny[kod]}</option>`);
      $naMenu.append(`<option value="${kod}">${kod} - ${oblubeneMeny[kod]}</option>`);
    });
    // default
    $zMenou.val('USD');
    $naMenu.val('EUR');
  }

  // prevod
  function prevedMenu() {
    $vysledok.text('Načítavam...');
    const ciastkaHodnota = parseFloat($ciastka.val());
    const zmenaZdroj    = $zMenou.val();
    const zmenaCiel     = $naMenu.val();

    if (isNaN(ciastkaHodnota) || ciastkaHodnota <= 0) {
      $vysledok.text('Zadajte platnú čiastku');
      return;
    }
    if (!zmenaZdroj || !zmenaCiel) {
      $vysledok.text('Vyberte správne meny.');
      return;
    }
    if (zmenaZdroj === zmenaCiel) {
      $vysledok.text(`${ciastkaHodnota} ${zmenaZdroj} = ${ciastkaHodnota} ${zmenaCiel}`);
      return;
    }

    // tu som mal problém pretože, vo free verzii tohto môjho API musí moja premena byť stále cez USD...
    // nenašiel som bezplatnú verziu, ktorá by to umožňovala a to som pred spracovaním zadania nevedel, že narazím na takýto problém...
    let currencies = [];
    if (zmenaZdroj !== 'USD') currencies.push(zmenaZdroj);
    if (zmenaCiel  !== 'USD') currencies.push(zmenaCiel);
    currencies = [...new Set(currencies)];
    
    const url = `https://apilayer.net/api/live?access_key=${API_KEY}&source=USD&currencies=${currencies.join(',')}&format=1`;

    $.ajax({
      url: url,
      method: 'GET',
      success: function(data) {
        if (!data || !data.quotes) {
          $vysledok.text('Nepodarilo sa načítať dáta z API.');
          console.error(data);
          return;
        }

        let konecnyKurz;
        if (zmenaZdroj === 'USD') {
          konecnyKurz = data.quotes['USD' + zmenaCiel];
        }
        else if (zmenaCiel === 'USD') {
          const r = data.quotes['USD' + zmenaZdroj];
          konecnyKurz = 1 / r;
        } else {
          const rZdroj = data.quotes['USD' + zmenaZdroj];
          const rCiel  = data.quotes['USD' + zmenaCiel];
          konecnyKurz = (1 / rZdroj) * rCiel;
        }

        if (!konecnyKurz) {
          $vysledok.text('Kurz pre dané meny sa nepodarilo vypočítať.');
          return;
        }

        const vyslednaSuma = (ciastkaHodnota * konecnyKurz).toFixed(2);
        const text = `${ciastkaHodnota} ${zmenaZdroj} = ${vyslednaSuma} ${zmenaCiel}`;
        $vysledok.text(text);
        pridajDoHistorie(text);
      },
      error: function(err) {
        console.error(err);
        $vysledok.text('Chyba pri volaní CurrencyLayer API.');
      }
    });
  }

  // ukladanie_do_historie
  function pridajDoHistorie(text) {
    if ($historiaList.children().length >= 10) {
      $historiaList.find('li').last().remove();
    }
    $historiaList.prepend(`<li>${text}</li>`);
  }

  // prehod
  function prehodMeny() {
    const temp = $zMenou.val();
    $zMenou.val($naMenu.val());
    $naMenu.val(temp);
  }

  // aktualne_kurzy
  function nacitajAktualneKurzy() {
    const kody = Object.keys(oblubeneMeny).sort().filter(c => c !== 'USD');
    const url = `https://apilayer.net/api/live?access_key=${API_KEY}&source=USD&currencies=${kody.join(',')}&format=1`;

    $.ajax({
      url: url,
      method: 'GET',
      success: function(data) {
        if (!data || !data.quotes) {
          console.error('Nepodarilo sa načítať aktuálne kurzy', data);
          return;
        }
        $aktualneKurzyTelo.empty();

        // 1.riadok_USD
        const $usdRiadok = vykresliRiadokKurzu('USD', 1, 'US Dollar');
        $usdRiadok.addClass('highlight-base');
        $aktualneKurzyTelo.append($usdRiadok);

        // ostatne
        kody.forEach(kod => {
          const popis = oblubeneMeny[kod];
          const quote = data.quotes['USD' + kod];
          if (!quote) return;

          const $riadok = vykresliRiadokKurzu(kod, quote, popis);
          $aktualneKurzyTelo.append($riadok);
        });
      },
      error: function(err) {
        console.error('Chyba pri volaní aktuálnych kurzov:', err);
      }
    });
  }

  function vykresliRiadokKurzu(kod, kurz, popis) {
    // tú zmenu som iba nasimuloval...
    const nahodnaZmena = (Math.random() * 2 - 1).toFixed(3); 
    const finalChange = (nahodnaZmena * 100).toFixed(3); 
    const jeNegativ = (nahodnaZmena < 0);
    const changeClass = jeNegativ ? 'change-negative' : 'change-positive';
    const grafHtml   = vytvorMiniGraf(jeNegativ);

    const $tr = $(`
      <tr data-kod="${kod}">
        <td>
          <span style="margin-right: 0.5em;">${emojiVlajka(kod)}</span>
          <strong>${kod}</strong><br>
          <small>${popis}</small>
        </td>
        <td class="rateCell">${kurz.toFixed(5)}</td>
        <td class="${changeClass}">${jeNegativ ? '' : '+'}${finalChange}%</td>
        <td>${grafHtml}</td>
      </tr>
    `);

    // ulozenie_kurzu_do_data_na_prehod
    $tr.data('originalRate', kurz);

    return $tr;
  }

  // graf je taktiež len simulovaný...
  function vytvorMiniGraf(jeNegativ) {
    const color = jeNegativ ? '#f44336' : '#4caf50';
    const body = [];
    let x = 0;
    for (let i = 0; i < 10; i++) {
      const y = Math.random() * 30;
      body.push(`${x},${y}`);
      x += 8;
    }
    return `
      <div class="mini-chart">
        <svg width="80" height="30">
          <polyline points="${body.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>
        </svg>
      </div>
    `;
  }

  function emojiVlajka(kodMeny) {
    if (kodMeny === 'USD') return '🇺🇸';
    if (kodMeny === 'EUR') return '🇪🇺';
    if (kodMeny === 'GBP') return '🇬🇧';
    if (kodMeny === 'JPY') return '🇯🇵';
    if (kodMeny === 'CAD') return '🇨🇦';
    if (kodMeny === 'AUD') return '🇦🇺';
    if (kodMeny === 'CHF') return '🇨🇭';
    if (kodMeny === 'CNY') return '🇨🇳';
    if (kodMeny === 'HKD') return '🇭🇰';
    if (kodMeny === 'NZD') return '🇳🇿';
    if (kodMeny === 'SEK') return '🇸🇪';
    if (kodMeny === 'NOK') return '🇳🇴';
    if (kodMeny === 'DKK') return '🇩🇰';
    if (kodMeny === 'PLN') return '🇵🇱';
    if (kodMeny === 'CZK') return '🇨🇿';
    return '🌐';
  }

  // prehod
  $prehodPrep.on('change', function() {
    const jePrehod = $(this).is(':checked');
    $('#aktualneKurzyTelo tr').each(function() {
      const $tr = $(this);
      const povodnyKurz = parseFloat($tr.data('originalRate'));
      if (!povodnyKurz) return;

      const $rateCell = $tr.find('.rateCell');
      if (jePrehod) {
        $rateCell.text((1 / povodnyKurz).toFixed(5));
      } else {
        $rateCell.text(povodnyKurz.toFixed(5));
      }
    });
  });

  nacitajMeny();
  $previestBtn.on('click', prevedMenu);
  $zamenBtn.on('click', prehodMeny);

  nacitajAktualneKurzy();
});
