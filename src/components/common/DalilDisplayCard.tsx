import type {DalilKind} from '../../lib/noteTemplates';

interface DalilDisplayCardProps {
  arabicText?: string | null;
  transliteration?: string | null;
  translation?: string | null;
  dalilKind?: DalilKind;
  dalilSource?: string | null;
  className?: string;
}

function getDalilHeading(kind: DalilKind): string {
  switch (kind) {
    case 'quran':
      return 'Dalil Ayat al-Quran';
    case 'hadith':
      return 'Dalil Hadis Nabi SAW';
    default:
      return 'Lafaz & Bacaan';
  }
}

export function DalilDisplayCard({
  arabicText,
  transliteration,
  translation,
  dalilKind = 'general',
  dalilSource,
  className = '',
}: DalilDisplayCardProps) {
  const hasArabic = Boolean(arabicText && arabicText.trim());
  const hasTranslit = Boolean(transliteration && transliteration.trim());
  const hasTranslation = Boolean(translation && translation.trim());
  const hasSource = Boolean(dalilSource && dalilSource.trim());

  if (!hasArabic && !hasTranslit && !hasTranslation) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-[#e6dcc6] bg-[#fbf7ee] px-5 py-5 sm:px-7 sm:py-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#6b5324]">
        <span>{getDalilHeading(dalilKind)}</span>
        {hasSource && (
          <span className="text-[#064e3b] font-semibold">
            {dalilSource}
          </span>
        )}
      </div>

      {hasArabic && (
        <p
          dir="rtl"
          lang="ar"
          className="mt-4 text-center font-arabic text-2xl sm:text-3xl leading-[2.25] text-slate-900 select-text"
        >
          {arabicText}
        </p>
      )}

      {(hasTranslit || hasTranslation) && (
        <div
          className={`${
            hasArabic ? 'mt-4 border-t border-[#e6dcc6]/80 pt-3.5' : 'mt-2'
          } space-y-2 text-center sm:text-left`}
        >
          {hasTranslit && (
            <p className="text-sm italic leading-relaxed text-[#064e3b]">
              {transliteration}
            </p>
          )}
          {hasTranslation && (
            <p className="text-sm leading-relaxed text-slate-700">
              <span className="font-semibold text-slate-900">Maksud: </span>
              {translation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
