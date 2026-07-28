// App bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl && !yearEl.value) {
    yearEl.value = new Date().getFullYear().toString();
  }

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

  // --- Toggle Enex Sales ---
  const enexSalesToggle = document.getElementById('enexSalesToggle');
  const enexSalesFields = Array.from(document.querySelectorAll('[data-enex-sales-hidden]'));

  const syncEnexSalesMode = () => {
    const isActive = enexSalesToggle?.getAttribute('aria-pressed') === 'true';

    enexSalesFields.forEach(field => {
      field.classList.toggle('hidden', isActive);
      field.querySelectorAll('input, select, textarea').forEach(input => {
        input.disabled = isActive;
      });
    });
  };

  if (enexSalesToggle) {
    enexSalesToggle.addEventListener('click', () => {
      const nextState = enexSalesToggle.getAttribute('aria-pressed') !== 'true';
      enexSalesToggle.setAttribute('aria-pressed', nextState.toString());
      syncEnexSalesMode();
      updateMailPreview();
    });
    syncEnexSalesMode();
  }

  // --- Supplier ROEN: PS max sempre 140 bar ---
  const supplierRadios = Array.from(document.querySelectorAll('input[name="supplier"]'));
  const ps120 = document.getElementById('ps120');
  const ps130 = document.getElementById('ps130');
  const ps140 = document.getElementById('ps140');
  const roenPsMessage = document.getElementById('roenPsMessage');

  const syncRoenPsMax = () => {
    const isRoen = document.getElementById('suppl_roen')?.checked === true;

    if (isRoen && ps140) {
      ps140.checked = true;
    }

    [ps120, ps130].forEach(input => {
      if (input) input.disabled = isRoen;
    });

    roenPsMessage?.classList.toggle('hidden', !isRoen);
  };

  supplierRadios.forEach(radio => radio.addEventListener('change', syncRoenPsMax));
  syncRoenPsMax();

  // --- Submit: genera mailto ---
  const form = document.getElementById('orderForm');
  if (!form) return;
  const mailBodyPreview = document.getElementById('mailBodyPreview');
  const copyMailBody = document.getElementById('copyMailBody');
  const clipboardToast = document.getElementById('clipboardToast');

  const getOrderMail = () => {
    const fd = new FormData(form);

    // Campi singoli
    const singleFields = [
      'supplier', 'orderName', 'jobNumber', 'year', 'deliveredIn', 'code',
      'quantity', 'deliveryDate', 'psMax', 'treatment', 'ral',
      'kitSpry', 'connections', 'treat_other_text', 'ral_other_text',
      'notes'
    ];

    const data = {};
    singleFields.forEach(k => data[k] = (fd.get(k) || '').toString().trim());
    const isEnexSales = enexSalesToggle?.getAttribute('aria-pressed') === 'true';

    // Checkbox multipli
    const additional = fd.getAll('additionalOptions')
      .map(v => v.toString().trim())
      .filter(Boolean);

    // Normalizza campi "Other"
    if (data['treatment'] !== 'Other') data['treat_other_text'] = '';
    if (data['ral'] !== 'Other')       data['ral_other_text']   = '';

    // Subject
    const yr = data.year || new Date().getFullYear().toString();
    const order = !isEnexSales && data.jobNumber
      ? `${data.jobNumber} - ${data.orderName || 'Unknown'}`
      : data.orderName || 'Unknown';
    const subject = `Gascooler Order ${yr} - ${order}`;

    // Body
    let body = '';
    body += "Good morning, new order with the following specs. Attached datasheet for reference.\n\n";
    body += `SUPPLIER: ${data.supplier}\n`;
    body += `NAME JOB: ${data.orderName}\n`;
    if (!isEnexSales) {
      body += `JOB NUMBER: ${data.jobNumber}\n`;
    }
    body += `YEAR: ${yr}\n`;
    if (!isEnexSales) {
      body += `DELIVERED IN: ${data.deliveredIn}\n`;
      body += `CODE: ${data.code}\n`;
    }
    body += `QUANTITY: ${data.quantity}\n`;
    if (!isEnexSales) {
      body += `DELIVERED FOR THE DAY: ${data.deliveryDate}\n`;
    }
    body += `PS MAX: ${data.psMax}\n`;
    body += `TREATMENT: ${data.treatment}${data.treatment === 'Other' && data.treat_other_text ? ` (${data.treat_other_text})` : ''}\n`;
    body += `RAL: ${data.ral}${data.ral === 'Other' && data.ral_other_text ? ` (${data.ral_other_text})` : ''}\n`;
    body += `KIT SPRY: ${data.kitSpry}\n`;
    body += `CONNECTIONS: ${data.connections}\n`;

    if (additional.length) {
      body += `\nADDITIONAL OPTIONS:\n`;
      additional.forEach(opt => { body += `- ${opt}\n`; });
    }

    if (data.notes) {
      body += `\nNOTE:\n${data.notes}\n`;
    }

    return { subject, body };
  };

  const updateMailPreview = () => {
    if (!mailBodyPreview) return;
    mailBodyPreview.textContent = getOrderMail().body;
  };

  form.addEventListener('input', updateMailPreview);
  form.addEventListener('change', updateMailPreview);

  if (copyMailBody) {
    copyMailBody.addEventListener('click', async () => {
      const { body } = getOrderMail();

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(body);
        } else {
          copyTextFallback(body);
        }

        showClipboardToast(clipboardToast);
      } catch {
        copyTextFallback(body);
        showClipboardToast(clipboardToast);
      }
    });
  }

  updateMailPreview();

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const { subject, body } = getOrderMail();

    // Mailto
    const mailto = `mailto:ogneva.viktoriia@enextechnologies.com` +
                   `?subject=${encodeURIComponent(subject)}` +
                   `&cc=${encodeURIComponent('enex.acquisti@enextechnologies.com')}` +
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

function copyTextFallback(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function showClipboardToast(toast) {
  if (!toast) return;

  window.clearTimeout(showClipboardToast.timeoutId);
  toast.classList.remove('hidden');
  showClipboardToast.timeoutId = window.setTimeout(() => {
    toast.classList.add('hidden');
  }, 1400);
}
