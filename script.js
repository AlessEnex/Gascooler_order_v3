// App bootstrap
document.addEventListener('DOMContentLoaded', () => {
  // --- Datepicker robusto (Flatpickr + fallback nativo) ---
  const dateEl = document.getElementById('deliveryDate');
  if (dateEl) {
    try {
      if (typeof flatpickr === 'function') {
        const fp = flatpickr(dateEl, {
          dateFormat: 'd/m/Y',
          allowInput: false,   // input gestito dal calendario
          clickOpens: true,
          disableMobile: true  // forza il popup anche su mobile supportati
        });
        // Apri il calendario su focus/click
        const open = () => fp && fp.open();
        dateEl.addEventListener('focus', open);
        dateEl.addEventListener('click', open);
      } else {
        // Fallback nativo
        dateEl.type = 'date';
        dateEl.autocomplete = 'off';
      }
    } catch {
      dateEl.type = 'date';
      dateEl.autocomplete = 'off';
    }
  }

  // --- Toggle "Other…" Treatment & RAL ---
  bindOtherToggle({
    groupName: 'treatment',
    otherId: 'treat_other',
    boxId: 'treat_other_box',
    textId: 'treat_other_text'
  });
  bindOtherToggle({
    groupName: 'ral',
    otherId: 'ral_other',
    boxId: 'ral_other_box',
    textId: 'ral_other_text'
  });

  // --- Submit: genera mailto ---
  const form = document.getElementById('orderForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const fd = new FormData(form);

    // Campi singoli
    const singleFields = [
      'supplier', 'orderName', 'year', 'deliveredIn', 'code',
      'quantity', 'deliveryDate', 'psMax', 'treatment', 'ral',
      'kitSpry', 'connections', 'treat_other_text', 'ral_other_text'
    ];

    const data = {};
    singleFields.forEach(k => data[k] = (fd.get(k) || '').toString().trim());

    // Checkbox multipli
    const additional = fd.getAll('additionalOptions')
      .map(v => v.toString().trim())
      .filter(Boolean);

    // Normalizza campi "Other"
    if (data['treatment'] !== 'Other') data['treat_other_text'] = '';
    if (data['ral'] !== 'Other')       data['ral_other_text']   = '';

    // Subject
    const yr = data.year || new Date().getFullYear().toString();
    const order = data.orderName || 'Unknown';
    const subject = `Gascooler Order ${yr} - ${order}`;

    // Body
    let body = '';
    body += "Good morning, new order with the following specs. Attached datasheet for reference.\n\n";
    body += `SUPPLIER: ${data.supplier}\n`;
    body += `ORDERNAME: ${data.orderName}\n`;
    body += `YEAR: ${yr}\n`;
    body += `DELIVERED IN: ${data.deliveredIn}\n`;
    body += `CODE: ${data.code}\n`;
    body += `QUANTITY: ${data.quantity}\n`;
    body += `DELIVERED FOR THE DAY: ${data.deliveryDate}\n`;
    body += `PS MAX: ${data.psMax}\n`;
    body += `TREATMENT: ${data.treatment}${data.treatment === 'Other' && data.treat_other_text ? ` (${data.treat_other_text})` : ''}\n`;
    body += `RAL: ${data.ral}${data.ral === 'Other' && data.ral_other_text ? ` (${data.ral_other_text})` : ''}\n`;
    body += `KIT SPRY: ${data.kitSpry}\n`;
    body += `CONNECTIONS: ${data.connections}\n`;

    if (additional.length) {
      body += `\nADDITIONAL OPTIONS:\n`;
      additional.forEach(opt => { body += `- ${opt}\n`; });
    }

    // Mailto
    const mailto = `mailto:romane.jacques@enextechnologies.com` +
                   `?subject=${encodeURIComponent(subject)}` +
                   `&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  });
});

/**
 * Collega un gruppo radio (groupName) ad un box di testo opzionale (Other…).
 * Mostra il box solo quando è selezionata l’opzione con id otherId.
 */
function bindOtherToggle({ groupName, otherId, boxId, textId }) {
  const radios = Array.from(document.querySelectorAll(`input[name="${groupName}"]`));
  const other = document.getElementById(otherId);
  const box = document.getElementById(boxId);
  const txt = document.getElementById(textId);

  if (!radios.length || !other || !box) return;

  const sync = () => {
    const show = other.checked;
    box.classList.toggle('hidden', !show);
    if (!show && txt) txt.value = '';
  };

  radios.forEach(r => r.addEventListener('change', sync));
  sync(); // stato iniziale
}
