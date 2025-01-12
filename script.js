$(document).ready(function() {
  const $amount        = $('#amount');
  const $fromCurrency  = $('#fromCurrency');
  const $toCurrency    = $('#toCurrency');
  const $convertBtn    = $('#convertBtn');
  const $swapBtn       = $('#swapBtn');
  const $result        = $('#result');
  const $historyList   = $('#historyList');

  // 1. Načtení všech dostupných měn a vyplnění selectů
  function loadCurrencies() {
    $.ajax({
      url: 'https://api.exchangerate.host/symbols',
      method: 'GET',
      success: function(data) {
        if (data && data.symbols) {
          const symbols = data.symbols; // objekt obsahující { "USD": { "description": ... }, ... }
          const currencyCodes = Object.keys(symbols).sort(); // všechny kódy měn seřazené abecedně

          currencyCodes.forEach(code => {
            const description = symbols[code].description;
            // Naplnění "Z měny"
            $fromCurrency.append(`<option value="${code}">${code} - ${description}</option>`);
            // Naplnění "Na měnu"
            $toCurrency.append(`<option value="${code}">${code} - ${description}</option>`);
          });

          // Nastavíme defaultní měny, např. z USD na EUR
          $fromCurrency.val('USD');
          $toCurrency.val('EUR');
        } else {
          alert('Nepodařilo se načíst seznam měn.');
        }
      },
      error: function() {
        alert('Chyba při komunikaci s API pro načtení seznamu měn.');
      }
    });
  }

  // 2. Funkce pro převod měn
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

    // 3. AJAX pro získání kurzu
    $.ajax({
      url: `https://api.exchangerate.host/latest?base=${fromVal}&symbols=${toVal}`,
      method: 'GET',
      success: function(data) {
        if (data && data.rates && data.rates[toVal]) {
          const rate = data.rates[toVal];
          const converted = (amountVal * rate).toFixed(2);
          const resultText = `${amountVal} ${fromVal} = ${converted} ${toVal}`;
          $result.text(resultText);

          // Uložení do historie
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

  // 4. Funkce pro přidání záznamu do historie
  function addToHistory(text) {
    // Limit historie např. na 10 položek
    if ($historyList.children().length >= 10) {
      $historyList.find('li').last().remove();
    }
    $historyList.prepend(`<li>${text}</li>`);
  }

  // 5. Prohození měn
  function swapCurrencies() {
    const temp = $fromCurrency.val();
    $fromCurrency.val($toCurrency.val());
    $toCurrency.val(temp);
  }

  // 6. Event Listeners
  $convertBtn.on('click', convertCurrency);
  $swapBtn.on('click', swapCurrencies);

  // 7. Načtení měn při startu
  loadCurrencies();
});
