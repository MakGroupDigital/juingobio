import { Order } from '../types';

const BRAND = {
  deepGreen: '#1A3C34',
  bioGreen: '#4CAF50',
  earthOrange: '#FF9800',
  lightBg: '#F9FBF9',
  textMuted: '#64748B'
};

const formatCurrency = (value: number) => `${Number(value || 0).toFixed(2)} CDF`;

const formatDate = (timestamp: number) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString();
  }
};

const methodLabel = (method?: Order['payment_method']) => {
  if (method === 'cash_on_delivery') return 'Paiement a la livraison';
  if (method === 'mobile') return 'Mobile Money';
  if (method === 'debit') return 'Carte Debit';
  if (method === 'credit') return 'Carte Credit';
  return 'Non specifie';
};

const loadLogo = async (): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/logo.svg';
  });
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export const downloadOrderDocumentAsJpg = async (order: Order) => {
  const isInvoice = order.payment_status === 'due_on_delivery' || order.payment_method === 'cash_on_delivery';
  const documentTitle = isInvoice ? 'FACTURE' : 'RECU DE PAIEMENT';
  const filePrefix = isInvoice ? 'facture' : 'recu';

  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 2000;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = BRAND.lightBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  bgGradient.addColorStop(0, BRAND.deepGreen);
  bgGradient.addColorStop(1, BRAND.bioGreen);
  ctx.fillStyle = bgGradient;
  drawRoundedRect(ctx, 80, 70, canvas.width - 160, 320, 32);
  ctx.fill();

  const logo = await loadLogo();
  if (logo) {
    ctx.drawImage(logo, 110, 110, 120, 120);
  } else {
    ctx.fillStyle = 'white';
    ctx.font = '700 30px Arial';
    ctx.fillText('juingoBIO', 110, 190);
  }

  ctx.fillStyle = 'white';
  ctx.font = '700 56px Arial';
  ctx.fillText(documentTitle, 270, 165);
  ctx.font = '500 30px Arial';
  ctx.fillText(`Commande #${order.id}`, 270, 225);
  ctx.fillText(`Date: ${formatDate(order.created_at)}`, 270, 275);

  ctx.textAlign = 'right';
  ctx.font = '700 42px Arial';
  ctx.fillText(formatCurrency(order.total_ttc), canvas.width - 130, 210);
  ctx.font = '500 26px Arial';
  ctx.fillText('Total TTC', canvas.width - 130, 255);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#FFFFFF33';
  drawRoundedRect(ctx, 100, 430, canvas.width - 200, 190, 24);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = '600 28px Arial';
  ctx.fillText(`Mode de paiement: ${methodLabel(order.payment_method)}`, 130, 490);
  ctx.fillText(
    `Statut paiement: ${isInvoice ? 'A payer a la livraison' : 'Deja paye'}`,
    130,
    535
  );
  ctx.font = '500 22px Arial';
  const addressLine = `Adresse livraison: ${(order.delivery_address || 'Adresse non fournie').slice(0, 86)}`;
  ctx.fillText(addressLine, 130, 575);

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, 80, 660, canvas.width - 160, 1070, 28);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = BRAND.deepGreen;
  ctx.font = '700 36px Arial';
  ctx.fillText('Detail des articles', 120, 740);

  let y = 810;
  ctx.font = '700 22px Arial';
  ctx.fillStyle = BRAND.textMuted;
  ctx.fillText('Article', 120, y);
  ctx.fillText('Qt', 760, y);
  ctx.fillText('PU', 860, y);
  ctx.fillText('Montant', 1100, y);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, y + 20);
  ctx.lineTo(canvas.width - 120, y + 20);
  ctx.stroke();

  y += 70;
  ctx.font = '500 24px Arial';
  order.items.slice(0, 14).forEach((item) => {
    const lineTotal = item.qty * item.price_at_purchase;
    ctx.fillStyle = BRAND.deepGreen;
    ctx.fillText(item.name.slice(0, 32), 120, y);
    ctx.fillStyle = BRAND.textMuted;
    ctx.fillText(String(item.qty), 760, y);
    ctx.fillText(formatCurrency(item.price_at_purchase), 860, y);
    ctx.fillText(formatCurrency(lineTotal), 1100, y);
    y += 56;
  });

  const summaryY = 1560;
  ctx.fillStyle = '#F8FAFC';
  drawRoundedRect(ctx, 880, summaryY - 50, 420, 180, 18);
  ctx.fill();

  ctx.fillStyle = BRAND.deepGreen;
  ctx.font = '500 24px Arial';
  ctx.fillText('Sous-total HT', 910, summaryY);
  ctx.fillText('TVA', 910, summaryY + 50);
  ctx.font = '700 30px Arial';
  ctx.fillText('Total TTC', 910, summaryY + 110);

  ctx.textAlign = 'right';
  ctx.font = '500 24px Arial';
  ctx.fillText(formatCurrency(order.total_ht), 1270, summaryY);
  ctx.fillText(formatCurrency(order.total_ttc - order.total_ht), 1270, summaryY + 50);
  ctx.font = '700 32px Arial';
  ctx.fillStyle = BRAND.earthOrange;
  ctx.fillText(formatCurrency(order.total_ttc), 1270, summaryY + 110);
  ctx.textAlign = 'left';

  const footerGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  footerGradient.addColorStop(0, BRAND.deepGreen);
  footerGradient.addColorStop(1, '#235A4E');
  ctx.fillStyle = footerGradient;
  drawRoundedRect(ctx, 80, 1780, canvas.width - 160, 160, 24);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = '700 26px Arial';
  ctx.fillText('Merci de faire confiance a JuingoBIO', 120, 1850);
  ctx.font = '500 22px Arial';
  ctx.fillText('bio.juingo.com', 120, 1898);
  ctx.fillText('partenaire@juingo.com', 420, 1898);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${filePrefix}-${order.id}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
