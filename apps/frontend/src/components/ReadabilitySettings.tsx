interface ReadabilitySettingsProps {
  fontSizePt: number;
  onFontSizeChange: (value: number) => void;
}

const MIN_PT = 10;
const MAX_PT = 20;
const STEP_PT = 1;

export default function ReadabilitySettings({ fontSizePt, onFontSizeChange }: ReadabilitySettingsProps) {
  const clampPt = (value: number) => Math.min(MAX_PT, Math.max(MIN_PT, value));

  return (
    <section className="tm-page-readable border-4 border-[#6f4ca1] bg-[#16a51c] p-3 space-y-3">
      <h2 className="border border-[#ceb8e1] bg-[#d5b5ec] p-2 text-center text-sm font-black uppercase text-[#2e1f4a]">
        Readability Settings
      </h2>

      <div className="border-2 border-[#2a8a2b] bg-[#0d3f10] p-3 space-y-3">
        <label className="block text-sm font-bold text-[#efe56b] uppercase">
          Basis lettergrootte (pt): {fontSizePt}
        </label>

        <input
          type="range"
          min={MIN_PT}
          max={MAX_PT}
          step={STEP_PT}
          value={fontSizePt}
          onChange={(e) => onFontSizeChange(clampPt(Number(e.target.value)))}
          className="w-full accent-[#efe56b]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={MIN_PT}
            max={MAX_PT}
            step={STEP_PT}
            value={fontSizePt}
            onChange={(e) => onFontSizeChange(clampPt(Number(e.target.value) || 12))}
            className="w-24 border border-[#2a8a2b] bg-[#0a2e0d] px-2 py-1 text-sm text-[#d5f8b6]"
          />
          <button
            type="button"
            onClick={() => onFontSizeChange(12)}
            className="border border-[#efe56b] bg-[#4a3a0a] px-3 py-1 text-sm font-bold uppercase text-[#efe56b] hover:bg-[#6a5210]"
          >
            Reset 12 pt
          </button>
        </div>
      </div>

      <div className="border border-[#2a8a2b] bg-[#0a2e0d] p-3 text-sm text-[#d5f8b6] space-y-2">
        <p className="font-bold text-[#efe56b] uppercase">Live voorbeeld</p>
        <p>
          Deze tekst gebruikt je huidige leesbaarheidsinstelling. De waarde geldt centraal voor alle webapp pagina&apos;s.
        </p>
        <p>
          Huidige instelling: <strong>{fontSizePt} pt</strong>
        </p>
      </div>
    </section>
  );
}
