$(document).ready(function() {
  const $amount        = $('#amount');
  const $fromCurrency  = $('#fromCurrency');
  const $toCurrency    = $('#toCurrency');
  const $convertBtn    = $('#convertBtn');
  const $swapBtn       = $('#swapBtn');
  const $result        = $('#result');
  const $historyList   = $('#historyList');
  const $inverseToggle = $('#inverseToggle');
  const $liveRatesBody = $('#liveRatesBody');

  // 1. Seznam 15 nejpoužívanějších měn (kód => popis)
  const mostUsedCurrencies = {
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

  // 2. Naplníme <select> pouze těmito 15 měnami
  function loadCurrencies() {
    const codes = Object.keys(mostUsedCurrencies).sort();
    codes.forEach(code => {
      const desc = mostUsedCurrencies[code];
      // Do value dáváme JEN kód (např. PLN), v textu je "PLN - Polish Zloty"
      $fromCurrency.append(`<option value="${code}">${code} - ${desc}</option>`);
      $toCurrency.append(`<option value="${code}">${code} - ${desc}</option>`);
    });

    // Např. default Z: USD, Na: EUR
    $fromCurrency.val('USD');
    $toCurrency.val('EUR');
  }

  // 3. Funkce pro převod měn
  function convertCurrency() {
    const amountVal = parseFloat($amount.val());
    const fromVal   = $fromCurrency.val(); 
    const toVal     = $toCurrency.val();

    // Validace
    if (isNaN(amountVal) || amountVal <= 0) {
      $result.text('Prosím, zadejte platnou částku větší než 0.');
      return;
    }
    if (!fromVal || !toVal) {
      $result.text('Není zvolena měna pro konverzi.');
      return;
    }

    // 4. AJAX pro získání kurzu
    $.ajax({
      url: `https://api.exchangerate.host/latest?base=${fromVal}&symbols=${toVal}`,
      method: 'GET',
      success: function(data) {
        if (data && data.rates && data.rates[toVal]) {
          const rate = data.rates[toVal];
          const converted = (amountVal * rate).toFixed(2);
          const resultText = `${amountVal} ${fromVal} = ${converted} ${toVal}`;
          $result.text(resultText);
          addToHistory(resultText);
        } else {
          $result.text('Nepodařilo se získat kurz pro zvolené měny.');
        }
      },
      error: function() {
        $result.text('Chyba při komunikaci s API pro převod.');
      }
    });
  }

  // 5. Funkce pro přidání záznamu do historie
  function addToHistory(text) {
    if ($historyList.children().length >= 10) {
      $historyList.find('li').last().remove();
    }
    $historyList.prepend(`<li>${text}</li>`);
  }

  // 6. Prohození měn
  function swapCurrencies() {
    const temp = $fromCurrency.val();
    $fromCurrency.val($toCurrency.val());
    $toCurrency.val(temp);
  }

  // 7. Live Exchange Rates: vygeneruje tabulku s 15 měnami (base=USD)
  function loadLiveRates() {
    const base = 'USD';
    $.ajax({
      url: `https://api.exchangerate.host/latest?base=${base}`,
      method: 'GET',
      success: function(data) {
        if (!data || !data.rates) return;
        $liveRatesBody.empty();

        const codes = Object.keys(mostUsedCurrencies).sort();
        codes.forEach(code => {
          const desc = mostUsedCurrencies[code];
          if (code === base) {
            // base = USD => rate = 1
            const $row = renderRateRow(code, 1, desc);
            $liveRatesBody.append($row);
          } else {
            const rate = data.rates[code];
            if (rate) {
              const $row = renderRateRow(code, rate, desc);
              $liveRatesBody.append($row);
            }
          }
        });
      }
    });
  }

  // 8. Vytvoří DOM řádku tabulky
  function renderRateRow(code, rate, desc) {
    // "Change (24h)" – simulace +/- 
    const changePerc = (Math.random() * 2 - 1).toFixed(3); // -1.000 až 1.000
    const isNegative = (changePerc < 0);
    const changeClass = isNegative ? 'change-negative' : 'change-positive';
    const finalChange = (changePerc * 100).toFixed(2);  // -100% až 100%

    // Chart
    const chartHtml = renderMiniChart(isNegative);

    // Vytvoříme řádek jako jQuery objekt
    const $tr = $(`
      <tr data-code="${code}">
        <td>
          <span style="margin-right: 0.5em;">${getFlagEmoji(code)}</span>
          <strong>${code}</strong><br>
          <small>${desc}</small>
        </td>
        <td class="rateCell">${rate.toFixed(5)}</td>
        <td class="${changeClass}">${isNegative ? '' : '+'}${finalChange}%</td>
        <td>${chartHtml}</td>
        <td><button class="send-button">Send</button></td>
      </tr>
    `);

    // Uložíme si "originální kurz" do data, abychom mohli přepínat Inverse
    $tr.data('originalRate', rate);

    return $tr;
  }

  // 9. Jednoduché pseudo-SVG pro "graf"
  function renderMiniChart(isNegative) {
    const color = isNegative ? '#f44336' : '#4caf50';
    const lines = [];
    let x = 0;
    for (let i = 0; i < 10; i++) {
      const y = Math.random() * 30;
      lines.push(`${x},${y}`);
      x += 8; 
    }
    return `
      <div class="mini-chart">
        <svg width="80" height="30">
          <polyline points="${lines.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>
        </svg>
      </div>
    `;
  }

  // 10. Emoji vlajky (jen ukázkově)
  function getFlagEmoji(countryCode) {
    // drobné hacky: GB => UK, EU => 🇪🇺
    let cc = countryCode.substring(0,2).toUpperCase();
    if (cc === 'GB') cc = 'UK';
    if (cc === 'EU') return '🇪🇺';
    // Převedeme znaky na regionální vlajky
    return cc.replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
  }

  // 11. Toggle "Inverse" – zobrazuje 1 base => X code, nebo 1 code => X base
  $inverseToggle.on('change', function() {
    const isInverse = $(this).is(':checked');
    $('#liveRatesBody tr').each(function() {
      const $tr = $(this);
      const originalRate = parseFloat($tr.data('originalRate'));
      const $rateCell = $tr.find('.rateCell');
      if (isNaN(originalRate)) return;

      if (isInverse) {
        // Zobrazíme 1 / originální kurz
        $rateCell.text((1 / originalRate).toFixed(5));
      } else {
        // Zpátky na originální kurz
        $rateCell.text(originalRate.toFixed(5));
      }
    });
  });

  // ---- Spouštíme vše při loadu ----
  loadCurrencies();   // Naplní <select> 15 měn
  loadLiveRates();    // Vygeneruje tabulku (base=USD)
  $convertBtn.on('click', convertCurrency);
  $swapBtn.on('click', swapCurrencies);
});
