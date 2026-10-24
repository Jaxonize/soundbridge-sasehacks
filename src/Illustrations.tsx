export function BridgeArt() {
  return (
    <svg
      className="bridge-art"
      viewBox="0 0 440 290"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="243" cy="141" r="116" fill="#f3ddce" />
      <circle cx="243" cy="141" r="90" stroke="#eabda2" strokeDasharray="3 8" />
      <path
        d="M47 150c40-85 93-85 135 0s95 85 139 0 73-72 100-28"
        stroke="#de704b"
        strokeWidth="2"
        strokeDasharray="5 6"
      />
      <g transform="rotate(-9 145 144)">
        <rect
          x="72"
          y="48"
          width="140"
          height="193"
          rx="21"
          fill="#fffaf2"
          stroke="#292d28"
          strokeWidth="2.5"
        />
        <rect x="84" y="61" width="116" height="164" rx="12" fill="#edc9b2" />
        <rect x="119" y="67" width="44" height="7" rx="4" fill="#292d28" />
        <path d="M105 167c0-37 65-39 65 0v58h-65z" fill="#768b77" />
        <path d="M112 109c0-32 49-32 49 0v26c0 33-49 31-49 0z" fill="#ba7155" />
        <path
          d="M108 118c-14-37 12-52 32-45 26-7 36 30 22 47l-10-24c-15 13-31 2-31 2l-6 24z"
          fill="#3f3e33"
        />
        <path
          d="M125 137q11 10 21 0"
          stroke="#723c2c"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="124" cy="121" r="2" fill="#353931" />
        <circle cx="148" cy="121" r="2" fill="#353931" />
      </g>
      <g transform="rotate(8 298 148)">
        <rect
          x="235"
          y="65"
          width="145"
          height="184"
          rx="20"
          fill="#fffaf2"
          stroke="#292d28"
          strokeWidth="2.5"
        />
        <rect x="247" y="79" width="121" height="155" rx="10" fill="#c8d4c5" />
        <path d="M260 183c0-40 92-40 92 0v51h-92z" fill="#e37e54" />
        <path d="M282 119c0-31 46-31 46 0v27c0 31-46 31-46 0z" fill="#e8af83" />
        <path
          d="M280 124c-16-25 3-49 23-41 21-9 40 19 25 43l-7-23c-13 7-27 5-27 5l-7 20z"
          fill="#30382f"
        />
        <circle cx="294" cy="132" r="2" fill="#353931" />
        <circle cx="316" cy="132" r="2" fill="#353931" />
        <path
          d="M296 148q10 7 18-1"
          stroke="#935e45"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(-4 310 52)">
        <rect
          x="270"
          y="19"
          width="126"
          height="55"
          rx="15"
          fill="#fffaf2"
          stroke="#292d28"
          strokeWidth="2"
        />
        <path
          d="M286 74v13l15-13"
          fill="#fffaf2"
          stroke="#292d28"
          strokeWidth="2"
        />
        <path
          d="M287 39h89M287 51h61"
          stroke="#70816e"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <circle cx="73" cy="231" r="29" fill="#ef7049" />
      <path
        d="M59 231v-6m7 15v-17m7 21v-28m7 21v-13m7 8v-4"
        stroke="#fffaf2"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="m384 155 8-13 8 13m-8-13v29M53 71l3-11 3 11 11 3-11 3-3 11-3-11-11-3z"
        stroke="#767f61"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KettleArt({ scenario = 0 }: { scenario?: number }) {
  return (
    <svg
      viewBox="0 0 600 400"
      className="scene-art"
      aria-label={
        [
          "Illustration of a kettle in a cozy kitchen",
          "Illustration of a train station",
          "Illustration of a front door",
        ][scenario]
      }
      role="img"
    >
      <rect
        width="600"
        height="400"
        fill={["#d8ded0", "#d2d9dd", "#e0d4c6"][scenario]}
      />
      <circle cx="475" cy="63" r="125" fill="#f4eee1" opacity=".6" />
      {scenario === 0 ? (
        <>
          <rect y="270" width="600" height="130" fill="#baa58b" />
          <rect y="270" width="600" height="14" fill="#a18d75" />
          <rect x="30" y="40" width="175" height="170" rx="4" fill="#f7f1df" />
          <path d="M117 40v170M30 125h175" stroke="#9da78d" strokeWidth="7" />
          <path d="M48 168q30-42 65-17t74-13v55H48z" fill="#a7b58f" />
          <rect x="364" y="69" width="185" height="13" rx="3" fill="#9b8970" />
          <rect x="379" y="34" width="33" height="35" rx="4" fill="#ece0c7" />
          <rect x="422" y="21" width="29" height="48" rx="4" fill="#bd7755" />
          <path
            d="M490 67v-32m0 18c-32-1-29-32-29-32 26 0 31 22 29 32m0-11c5-27 27-27 27-27 4 25-16 28-27 27"
            stroke="#6c805d"
            fill="#6c805d"
            strokeWidth="3"
          />
          <ellipse
            cx="294"
            cy="293"
            rx="94"
            ry="12"
            fill="#8d7c66"
            opacity=".3"
          />
          <path
            d="M249 188c-8 22-35 38-33 79 0 21 121 21 121 0 2-41-25-57-33-79z"
            fill="#d78250"
          />
          <path d="m239 212-40-26 10 48 20 8" fill="#d78250" />
          <path
            d="M302 194c66-30 77 53 33 61"
            fill="none"
            stroke="#3e4939"
            strokeWidth="13"
          />
          <path
            d="M244 189h67"
            stroke="#3e4939"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path d="M272 175h14v11h-14z" fill="#3e4939" />
          <g
            className="steam"
            fill="none"
            stroke="#fff9ed"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <path d="M264 151c-23-23 19-33 0-56" />
            <path d="M289 154c-20-21 22-40 3-67" />
            <path d="M313 155c-16-18 16-29 2-43" />
          </g>
          <path d="M407 238h47v42h-47z" fill="#f1e7ce" />
          <path
            d="M454 244c32-5 24 34 0 25"
            fill="none"
            stroke="#f1e7ce"
            strokeWidth="8"
          />
        </>
      ) : scenario === 1 ? (
        <>
          <rect y="285" width="600" height="115" fill="#949c91" />
          <path d="M0 345h600M0 365h600" stroke="#ecdfb6" strokeWidth="8" />
          <rect x="70" y="95" width="460" height="169" rx="30" fill="#f6f0df" />
          <path d="M70 224h460" stroke="#c47751" strokeWidth="17" />
          {[105, 195, 285, 375, 465].map((x) => (
            <rect
              key={x}
              x={x}
              y="125"
              width="45"
              height="62"
              rx="8"
              fill="#8b9f9b"
            />
          ))}
          <rect x="197" y="32" width="208" height="44" rx="4" fill="#37483d" />
          <text
            x="301"
            y="60"
            textAnchor="middle"
            fill="#fff8e6"
            fontSize="18"
            fontFamily="sans-serif"
          >
            PLATFORM 2 · 3 MIN
          </text>
          <circle cx="155" cy="269" r="18" fill="#394238" />
          <circle cx="447" cy="269" r="18" fill="#394238" />
        </>
      ) : (
        <>
          <rect x="167" y="44" width="243" height="345" rx="7" fill="#a39d86" />
          <rect x="184" y="61" width="209" height="328" rx="4" fill="#738673" />
          <rect
            x="214"
            y="89"
            width="149"
            height="122"
            rx="60"
            fill="#c5d3bd"
          />
          <path d="M288 89v122M214 151h149" stroke="#738673" strokeWidth="8" />
          <circle cx="362" cy="257" r="9" fill="#efd6a5" />
          <rect x="433" y="205" width="25" height="47" rx="7" fill="#f6eee0" />
          <circle cx="445" cy="227" r="7" fill="#d47a52" />
          <path
            d="M474 216q15 12 0 24M486 207q26 21 0 42"
            stroke="#bf7955"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect x="52" y="309" width="70" height="80" rx="5" fill="#b57554" />
          <path
            d="M87 309v-87m0 42c-59 1-42-58-42-58 34 2 44 32 42 58m1 15c49-1 41-48 41-48-33 0-44 27-41 48"
            fill="#687e59"
            stroke="#687e59"
            strokeWidth="6"
          />
        </>
      )}
    </svg>
  );
}
