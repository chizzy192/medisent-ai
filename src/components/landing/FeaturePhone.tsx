import { brand } from "@/config/brand";

/**
 * A basic feature phone (BUILD_PLAN Stage 0, landing section 6): dark body, green LCD, 12-key
 * keypad. It shows the SMS reminder and the "1" reply. Drawn in code so it needs no asset and
 * scales with text. The device colours are an illustration, like pill colours, not UI tokens.
 */
const KEYS = ["1", "2 abc", "3 def", "4 ghi", "5 jkl", "6 mno", "7 pqrs", "8 tuv", "9 wxyz", "*", "0", "#"];

export function FeaturePhone({ sms, reply, figureLabel }: { sms: string; reply: string; figureLabel: string }) {
  return (
    <figure aria-label={figureLabel} className="mx-auto w-full min-w-0 max-w-[220px]">
      <div className="rounded-[28px] bg-[#2A3342] p-3 pt-4 ring-1 ring-[#1A2130]">
        <div className="max-w-full rounded-lg bg-[#C9D7A8] p-3 font-mono text-[0.8125rem] leading-snug [overflow-wrap:anywhere] text-[#1F2A1A]">
          <p className="uppercase">{brand.name}</p>
          <p className="mt-1">{sms}</p>
          <p className="mt-1">
            &gt; {reply}
            <span aria-hidden="true">_</span>
          </p>
        </div>
        <div aria-hidden="true" className="mt-3 grid grid-cols-3 gap-1.5">
          {KEYS.map((key) => (
            <span
              key={key}
              className="flex min-h-6 items-center justify-center rounded-md bg-[#3B4557] px-1 py-0.5 font-mono text-label whitespace-nowrap text-[#C8D0DC]"
            >
              {key}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
