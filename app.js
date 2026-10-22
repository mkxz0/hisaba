const form = document.querySelector("#invoice-form");
const itemsList = document.querySelector("#items-list");
const saveStatus = document.querySelector("#save-status");
const storageKey = "hisaba.invoice.v1";
const locale = "ar-SA";
const currencyLabels = {
  SAR: "ر.س",
  AED: "د.إ",
  EGP: "ج.م",
  KWD: "د.ك",
  USD: "$",
  EUR: "€",
};

function addItem(item = {}) {
  const row = document.createElement("div");
  row.className = "item-row";

  const description = document.createElement("input");
  description.name = "description";
  description.placeholder = "وصف الخدمة أو المنتج";
  description.value = item.description || "";
  description.setAttribute("aria-label", "وصف البند");

  const quantity = document.createElement("input");
  quantity.name = "quantity";
  quantity.type = "number";
  quantity.min = "0";
  quantity.step = "any";
  quantity.inputMode = "decimal";
  quantity.value = item.quantity ?? 1;
  quantity.setAttribute("aria-label", "الكمية");

  const price = document.createElement("input");
  price.name = "price";
  price.type = "number";
  price.min = "0";
  price.step = "any";
  price.inputMode = "decimal";
  price.placeholder = "0.00";
  price.value = item.price ?? "";
  price.setAttribute("aria-label", "السعر");

  const remove = document.createElement("button");
  remove.className = "remove-item";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "حذف البند");
  remove.addEventListener("click", () => {
    if (itemsList.children.length > 1) {
      row.remove();
      updateTotals();
      save();
    }
  });

  row.append(description, quantity, price, remove);
  itemsList.append(row);
  row.addEventListener("input", () => {
    updateTotals();
    save();
  });
}

function readItems() {
  return [...itemsList.querySelectorAll(".item-row")].map((row) => ({
    description: row.querySelector('[name="description"]').value,
    quantity: Number(row.querySelector('[name="quantity"]').value) || 0,
    price: Number(row.querySelector('[name="price"]').value) || 0,
  }));
}

function getCurrency() {
  return form.elements.currency.value;
}

function formatMoney(amount) {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
  return `${formatted} ${currencyLabels[getCurrency()] || getCurrency()}`;
}

function updateTotals() {
  const subtotal = readItems().reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxRate = Math.min(100, Math.max(0, Number(form.elements.taxRate.value) || 0));
  const tax = subtotal * taxRate / 100;
  document.querySelector("#subtotal").textContent = formatMoney(subtotal);
  document.querySelector("#tax-total").textContent = formatMoney(tax);
  document.querySelector("#grand-total").textContent = formatMoney(subtotal + tax);
  document.querySelector("#tax-rate-label").textContent = new Intl.NumberFormat(locale).format(taxRate);
}

function readForm() {
  return {
    business: form.elements.business.value,
    email: form.elements.email.value,
    client: form.elements.client.value,
    invoiceNumber: form.elements.invoiceNumber.value,
    issueDate: form.elements.issueDate.value,
    dueDate: form.elements.dueDate.value,
    currency: form.elements.currency.value,
    taxRate: form.elements.taxRate.value,
    notes: form.elements.notes.value,
    items: readItems(),
  };
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(readForm()));
    saveStatus.textContent = "تم الحفظ على جهازك";
  } catch (error) {
    saveStatus.textContent = "تعذّر الحفظ — قد تكون مساحة التخزين ممتلئة";
    console.error("Could not save invoice to local storage.", error);
  }
}

function load() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return false;

  let data;
  try {
    data = JSON.parse(saved);
  } catch (error) {
    console.error("Saved invoice data is invalid.", error);
    localStorage.removeItem(storageKey);
    return false;
  }

  for (const name of ["business", "email", "client", "invoiceNumber", "issueDate", "dueDate", "currency", "taxRate", "notes"]) {
    if (typeof data[name] === "string" && form.elements[name]) form.elements[name].value = data[name];
  }
  itemsList.replaceChildren();
  const items = Array.isArray(data.items) ? data.items : [];
  (items.length ? items : [{}]).forEach(addItem);
  return true;
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderPrintInvoice() {
  const data = readForm();
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxRate = Math.min(100, Math.max(0, Number(data.taxRate) || 0));
  const tax = subtotal * taxRate / 100;
  const printRoot = document.querySelector("#print-invoice");
  const itemRows = data.items.map((item) => `
    <tr>
      <td>${safeText(item.description || "—")}</td>
      <td>${safeText(new Intl.NumberFormat(locale).format(item.quantity))}</td>
      <td>${safeText(formatMoney(item.price))}</td>
      <td>${safeText(formatMoney(item.quantity * item.price))}</td>
    </tr>`).join("");

  printRoot.innerHTML = `
    <div class="print-header">
      <div><h1>${safeText(data.business || "فاتورة")}</h1><p>${safeText(data.email)}</p></div>
      <div><h2>فاتورة</h2><p>${safeText(data.invoiceNumber)}</p></div>
    </div>
    <div class="print-meta">
      <div><span>فاتورة إلى</span><strong>${safeText(data.client || "—")}</strong></div>
      <div><span>تاريخ الإصدار</span><strong>${safeText(data.issueDate || "—")}</strong></div>
      <div><span>تاريخ الاستحقاق</span><strong>${safeText(data.dueDate || "—")}</strong></div>
    </div>
    <table><thead><tr><th>الوصف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${itemRows}</tbody></table>
    <div class="print-summary">
      <div><span>المجموع الفرعي</span><strong>${safeText(formatMoney(subtotal))}</strong></div>
      <div><span>الضريبة (${safeText(taxRate)}٪)</span><strong>${safeText(formatMoney(tax))}</strong></div>
      <div><span>الإجمالي المستحق</span><strong>${safeText(formatMoney(subtotal + tax))}</strong></div>
    </div>
    ${data.notes ? `<p class="print-notes"><strong>ملاحظات:</strong><br>${safeText(data.notes).replace(/\n/g, "<br>")}</p>` : ""}
    <p class="print-thanks">شكرًا لثقتك بنا</p>`;
}

function resetInvoice() {
  if (!window.confirm("هل تريد بدء فاتورة جديدة؟ ستُحذف بيانات الفاتورة الحالية من هذا الجهاز.")) return;
  localStorage.removeItem(storageKey);
  form.reset();
  itemsList.replaceChildren();
  addItem();
  form.elements.issueDate.value = new Date().toISOString().slice(0, 10);
  form.elements.invoiceNumber.value = `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  updateTotals();
  saveStatus.textContent = "فاتورة جديدة";
  save();
}

document.querySelector("#add-item").addEventListener("click", () => {
  addItem();
  save();
});
document.querySelector("#clear-button").addEventListener("click", resetInvoice);
document.querySelector("#print-button").addEventListener("click", () => {
  renderPrintInvoice();
  window.print();
});
form.addEventListener("input", () => {
  updateTotals();
  save();
});
form.elements.currency.addEventListener("change", () => {
  updateTotals();
  save();
});

if (!load()) {
  form.elements.issueDate.value = new Date().toISOString().slice(0, 10);
  form.elements.invoiceNumber.value = `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  addItem();
}
updateTotals();
