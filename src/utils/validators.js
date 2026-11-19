const NAME = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PLATE = /^[A-Z]{3}\d{3}$/;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const empty = (v) => v === undefined || v === null || String(v).trim() === '';
const futureDate = (v) => !empty(v) && new Date(v) > today();
export const TECH_REVIEW_YEARS = 6; // la tecnomecánica aplica 6 años después del modelo del vehículo

// Suma años a una fecha 'YYYY-MM-DD' (usado para la vigencia de 1 año del SOAT).
export const addYears = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y + n, m - 1, d)).toISOString().slice(0, 10);
};

export function validatePersonal(f) {
  const e = {};
  if (empty(f.photo)) e.photo = 'La foto de perfil es obligatoria';
  if (empty(f.fullName)) e.fullName = 'El nombre es obligatorio';
  else if (f.fullName.length > 50) e.fullName = 'Máximo 50 caracteres';
  else if (!NAME.test(f.fullName)) e.fullName = 'Solo letras y espacios';
  if (empty(f.idNumber)) e.idNumber = 'El documento es obligatorio';
  else if (!/^\d{6,10}$/.test(f.idNumber)) e.idNumber = 'Debe tener entre 6 y 10 dígitos';
  if (empty(f.phone)) e.phone = 'El celular es obligatorio';
  else if (!/^\d{10}$/.test(f.phone)) e.phone = 'Debe tener 10 dígitos';
  if (empty(f.birthDate)) e.birthDate = 'La fecha de nacimiento es obligatoria';
  else {
    const limit = new Date(); limit.setFullYear(limit.getFullYear() - 18);
    if (new Date(f.birthDate) > limit) e.birthDate = 'Debes ser mayor de 18 años';
  }
  if (empty(f.gender)) e.gender = 'Selecciona un género';
  if (empty(f.email)) e.email = 'El correo es obligatorio';
  else if (!EMAIL.test(f.email)) e.email = 'Correo inválido';
  if (empty(f.language)) e.language = 'Selecciona un idioma';
  return e;
}

export function validateVehicle(f) {
  const e = {};
  const year = new Date().getFullYear();
  if (empty(f.category)) e.category = 'Selecciona una categoría';
  if (empty(f.plate)) e.plate = 'La placa es obligatoria';
  else if (!PLATE.test(f.plate.toUpperCase())) e.plate = 'Formato inválido (ej. ABC123)';
  if (empty(f.brand)) e.brand = 'La marca es obligatoria';
  else if (f.brand.length > 30) e.brand = 'Máximo 30 caracteres';
  if (empty(f.model)) e.model = 'El modelo es obligatorio';
  else if (f.model.length > 30) e.model = 'Máximo 30 caracteres';
  if (empty(f.year)) e.year = 'El año es obligatorio';
  else if (!/^\d{4}$/.test(f.year) || Number(f.year) > year) e.year = `Año de 4 dígitos, máximo ${year}`;
  if (empty(f.color)) e.color = 'Selecciona un color';
  if (empty(f.capacity)) e.capacity = 'La capacidad es obligatoria';
  else if (!/^\d+$/.test(f.capacity) || Number(f.capacity) < 1) e.capacity = 'Debe ser numérico';
  else if (f.category === 'xl' && Number(f.capacity) < 6) e.capacity = 'XL exige mínimo 6 pasajeros';
  if (empty(f.vehiclePhoto)) e.vehiclePhoto = 'La foto del vehículo (con la placa) es obligatoria';
  return e;
}

// Año desde el cual el vehículo debe tener tecnomecánica: modelo + 6 años.
export const techDueYear = (year) => Number(year) + TECH_REVIEW_YEARS;
export const needsTechReview = (year) => /^\d{4}$/.test(String(year || '')) && techDueYear(year) <= new Date().getFullYear();

export function validateDocs(f, vehicleYear) {
  const e = {};
  if (empty(f.licenseNumber)) e.licenseNumber = 'El número de licencia es obligatorio';
  else if (!/^\d{1,10}$/.test(f.licenseNumber)) e.licenseNumber = 'Solo números, máximo 10 dígitos';
  if (empty(f.licensePhoto)) e.licensePhoto = 'La foto de la licencia es obligatoria';
  if (!futureDate(f.licenseExpiry)) e.licenseExpiry = 'La licencia debe estar vigente';
  if (empty(f.soatPhoto)) e.soatPhoto = 'La foto del SOAT es obligatoria';
  // El SOAT dura 1 año: se pide la fecha de expedición y el vencimiento se calcula (+1 año).
  if (empty(f.soatIssueDate)) e.soatIssueDate = 'La fecha de expedición del SOAT es obligatoria';
  else if (new Date(f.soatIssueDate) > today()) e.soatIssueDate = 'La fecha no puede ser futura';
  else if (!futureDate(addYears(f.soatIssueDate, 1))) e.soatIssueDate = 'El SOAT ya está vencido (vigencia de 1 año)';
  if (needsTechReview(vehicleYear)) {
    if (empty(f.techPhoto)) e.techPhoto = 'La foto de la revisión es obligatoria';
    if (!futureDate(f.techExpiry)) e.techExpiry = 'La revisión debe estar vigente';
  }
  if (empty(f.mpEmail)) e.mpEmail = 'El correo de Mercado Pago es obligatorio';
  else if (!EMAIL.test(f.mpEmail)) e.mpEmail = 'Correo inválido';
  if (!f.acceptedTerms) e.acceptedTerms = 'Debes aceptar los términos';
  return e;
}