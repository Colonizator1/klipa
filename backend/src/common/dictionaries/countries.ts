/**
 * Static country list for the asset "where stored" picker (SPEC.md §4.7
 * `custody.country` + §9 two-step country → holder form). No provider or
 * dependency for this — ISO 3166-1 alpha-2 codes with a curated EN/RU name
 * set covering the currencies in scope (D-24) plus the countries a personal
 * portfolio is realistically custodied in.
 */
export interface Country {
  code: string;
  name: { en: string; ru: string };
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: { en: 'United States', ru: 'США' } },
  { code: 'GB', name: { en: 'United Kingdom', ru: 'Великобритания' } },
  { code: 'DE', name: { en: 'Germany', ru: 'Германия' } },
  { code: 'FR', name: { en: 'France', ru: 'Франция' } },
  { code: 'IT', name: { en: 'Italy', ru: 'Италия' } },
  { code: 'ES', name: { en: 'Spain', ru: 'Испания' } },
  { code: 'PT', name: { en: 'Portugal', ru: 'Португалия' } },
  { code: 'NL', name: { en: 'Netherlands', ru: 'Нидерланды' } },
  { code: 'BE', name: { en: 'Belgium', ru: 'Бельгия' } },
  { code: 'CH', name: { en: 'Switzerland', ru: 'Швейцария' } },
  { code: 'AT', name: { en: 'Austria', ru: 'Австрия' } },
  { code: 'IE', name: { en: 'Ireland', ru: 'Ирландия' } },
  { code: 'LU', name: { en: 'Luxembourg', ru: 'Люксембург' } },
  { code: 'PL', name: { en: 'Poland', ru: 'Польша' } },
  { code: 'CZ', name: { en: 'Czechia', ru: 'Чехия' } },
  { code: 'SK', name: { en: 'Slovakia', ru: 'Словакия' } },
  { code: 'HU', name: { en: 'Hungary', ru: 'Венгрия' } },
  { code: 'RO', name: { en: 'Romania', ru: 'Румыния' } },
  { code: 'BG', name: { en: 'Bulgaria', ru: 'Болгария' } },
  { code: 'GR', name: { en: 'Greece', ru: 'Греция' } },
  { code: 'CY', name: { en: 'Cyprus', ru: 'Кипр' } },
  { code: 'MT', name: { en: 'Malta', ru: 'Мальта' } },
  { code: 'SE', name: { en: 'Sweden', ru: 'Швеция' } },
  { code: 'NO', name: { en: 'Norway', ru: 'Норвегия' } },
  { code: 'DK', name: { en: 'Denmark', ru: 'Дания' } },
  { code: 'FI', name: { en: 'Finland', ru: 'Финляндия' } },
  { code: 'IS', name: { en: 'Iceland', ru: 'Исландия' } },
  { code: 'EE', name: { en: 'Estonia', ru: 'Эстония' } },
  { code: 'LV', name: { en: 'Latvia', ru: 'Латвия' } },
  { code: 'LT', name: { en: 'Lithuania', ru: 'Литва' } },
  { code: 'UA', name: { en: 'Ukraine', ru: 'Украина' } },
  { code: 'BY', name: { en: 'Belarus', ru: 'Беларусь' } },
  { code: 'RU', name: { en: 'Russia', ru: 'Россия' } },
  { code: 'MD', name: { en: 'Moldova', ru: 'Молдова' } },
  { code: 'GE', name: { en: 'Georgia', ru: 'Грузия' } },
  { code: 'AM', name: { en: 'Armenia', ru: 'Армения' } },
  { code: 'AZ', name: { en: 'Azerbaijan', ru: 'Азербайджан' } },
  { code: 'KZ', name: { en: 'Kazakhstan', ru: 'Казахстан' } },
  { code: 'UZ', name: { en: 'Uzbekistan', ru: 'Узбекистан' } },
  { code: 'KG', name: { en: 'Kyrgyzstan', ru: 'Киргизия' } },
  { code: 'TR', name: { en: 'Turkey', ru: 'Турция' } },
  { code: 'AE', name: { en: 'United Arab Emirates', ru: 'ОАЭ' } },
  { code: 'IL', name: { en: 'Israel', ru: 'Израиль' } },
  { code: 'SA', name: { en: 'Saudi Arabia', ru: 'Саудовская Аравия' } },
  { code: 'CA', name: { en: 'Canada', ru: 'Канада' } },
  { code: 'MX', name: { en: 'Mexico', ru: 'Мексика' } },
  { code: 'BR', name: { en: 'Brazil', ru: 'Бразилия' } },
  { code: 'AR', name: { en: 'Argentina', ru: 'Аргентина' } },
  { code: 'CN', name: { en: 'China', ru: 'Китай' } },
  { code: 'HK', name: { en: 'Hong Kong', ru: 'Гонконг' } },
  { code: 'JP', name: { en: 'Japan', ru: 'Япония' } },
  { code: 'KR', name: { en: 'South Korea', ru: 'Южная Корея' } },
  { code: 'SG', name: { en: 'Singapore', ru: 'Сингапур' } },
  { code: 'IN', name: { en: 'India', ru: 'Индия' } },
  { code: 'AU', name: { en: 'Australia', ru: 'Австралия' } },
  { code: 'NZ', name: { en: 'New Zealand', ru: 'Новая Зеландия' } },
  { code: 'ZA', name: { en: 'South Africa', ru: 'ЮАР' } },
  { code: 'OTHER', name: { en: 'Other', ru: 'Другое' } },
];

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export function isCountryCode(value: string): boolean {
  return BY_CODE.has(value);
}
