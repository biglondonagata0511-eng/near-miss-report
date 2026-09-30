/**
 * Date and Age calculation utilities
 */

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayOfWeekJapanese(dateString?: string): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        return DAY_NAMES[d.getDay()];
      }
    }
  } catch {
    // fallback
  }
  return '';
}

/**
 * Calculate age safely from birth date.
 * If blank or invalid, returns null without throwing errors.
 */
export function calculateAgeFromBirthDate(birthDateString?: string, referenceDateString?: string): number | null {
  if (!birthDateString || birthDateString.trim() === '') {
    return null;
  }

  try {
    const bParts = birthDateString.split('-');
    if (bParts.length !== 3) return null;

    const bYear = Number(bParts[0]);
    const bMonth = Number(bParts[1]) - 1;
    const bDay = Number(bParts[2]);

    const ref = referenceDateString ? new Date(referenceDateString) : new Date();
    if (isNaN(ref.getTime())) return null;

    let age = ref.getFullYear() - bYear;
    const m = ref.getMonth() - bMonth;

    if (m < 0 || (m === 0 && ref.getDate() < bDay)) {
      age--;
    }

    if (age >= 0 && age <= 130) {
      return age;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatJapaneseDate(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日`;
  }
  return dateString;
}
