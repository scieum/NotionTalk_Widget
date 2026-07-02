/**
 * 위젯 표시용 폰트 카탈로그 — notion-gallery-cover와 동일한 목록(CDN 무료 폰트).
 * 전부 미리 로드하지 않고, 위젯이 선택한 폰트만 FontFace API로 온디맨드 로드한다.
 */

export interface WidgetFont {
  id: string
  family: string
  label: string
  sources: { weight: number; url: string }[]
}

export const WIDGET_FONTS: WidgetFont[] = [
  {
    id: 'pretendard',
    family: 'Pretendard',
    label: 'Pretendard',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf' },
      { weight: 800, url: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-ExtraBold.otf' },
    ],
  },
  {
    id: 'suit',
    family: 'SUIT',
    label: 'SUIT',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT/fonts/static/woff2/SUIT-Regular.woff2' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT/fonts/static/woff2/SUIT-Bold.woff2' },
      { weight: 800, url: 'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT/fonts/static/woff2/SUIT-ExtraBold.woff2' },
    ],
  },
  {
    id: 'gmarketsans',
    family: 'GMarketSans',
    label: 'G마켓 산스',
    sources: [
      { weight: 300, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansLight.woff' },
      { weight: 500, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff' },
    ],
  },
  {
    id: 'scoredream',
    family: 'Escoredream',
    label: 'S-Core Dream',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-4Regular.woff' },
      { weight: 600, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-6Bold.woff' },
      { weight: 800, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-8Heavy.woff' },
    ],
  },
  {
    id: 'kkubulim',
    family: 'KkuBulLim',
    label: 'BM 꾸불림',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2410-1@1.0/BMkkubulimTTF-Regular.woff2' },
    ],
  },
  {
    id: 'ongleip',
    family: 'OngleipKonkon',
    label: '온글잎 콘콘',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2412-1@1.0/Ownglyph_corncorn-Rg.woff2' },
    ],
  },
  {
    id: 'gangwon',
    family: 'GangwonEducationModuche',
    label: '강원교육모두체',
    sources: [
      { weight: 300, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2201-2@1.0/GangwonEdu_OTFLightA.woff' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2201-2@1.0/GangwonEdu_OTFBoldA.woff' },
    ],
  },
  {
    id: 'gangwonpower',
    family: 'GangwonEducationTteontteon',
    label: '강원교육튼튼체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2201-2@1.0/GangwonEduPowerExtraBoldA.woff' },
    ],
  },
  {
    id: 'juache',
    family: 'Juache',
    label: '배민 주아체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_one@1.0/BMJUA.woff' },
    ],
  },
  {
    id: 'hakgyo',
    family: 'SchoolSafetyNotification',
    label: '학교안심 알림장',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimAllimjangTTF-R.woff2' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimAllimjangTTF-B.woff2' },
    ],
  },
  {
    id: 'lotteria',
    family: 'LotteriaChwapttaenggyeo',
    label: '롯데리아 촵땡겨체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/LOTTERIACHAB.woff2' },
    ],
  },
  {
    id: 'okdandan',
    family: 'OkDandan',
    label: 'OK단단',
    sources: [
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2508-2@1.0/OkDanDan-Bold.woff2' },
    ],
  },
  {
    id: 'kbo',
    family: 'KboDiamondGothic',
    label: 'KBO 다이아 고딕',
    sources: [
      { weight: 300, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2304-2@1.0/KBO-Dia-Gothic_light.woff' },
      { weight: 500, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2304-2@1.0/KBO-Dia-Gothic_medium.woff' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2304-2@1.0/KBO-Dia-Gothic_bold.woff' },
    ],
  },
  {
    id: 'dohyun',
    family: 'Dohyun',
    label: '배민 도현체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_one@1.0/BMDOHYEON.woff' },
    ],
  },
  {
    id: 'giranghaerang',
    family: 'Giranghaerang',
    label: '배민 기랑해랑체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_one@1.0/BMKIRANGHAERANG.woff' },
    ],
  },
  {
    id: 'hanna',
    family: 'Hanna',
    label: '배민 한나체',
    sources: [
      { weight: 400, url: 'https://fonts.gstatic.com/ea/hanna/v3/BM-HANNA.ttf' },
    ],
  },
  {
    id: 'joseon',
    family: 'JoseonGulim',
    label: '조선굴림체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@1.0/ChosunGu.woff' },
    ],
  },
  {
    id: 'eoyeonce',
    family: 'OngleipEoyeonce',
    label: '온글잎 의연체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2105@1.1/Uiyeun.woff' },
    ],
  },
  {
    id: 'ryuryu',
    family: 'OngleipRyuryu',
    label: '온글잎 류류체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2405-2@1.0/Ownglyph_ryurue-Rg.woff2' },
    ],
  },
  {
    id: 'parkdahyun',
    family: 'OngleipParkDahyeon',
    label: '온글잎 박다현체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2411-3@1.0/Ownglyph_ParkDaHyun.woff2' },
    ],
  },
  {
    id: 'bookk',
    family: 'BookkMyungjo',
    label: '부크크 명조체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Bd.woff2' },
    ],
  },
  {
    id: 'yoon',
    family: 'YoonChoWooSan',
    label: '윤초우산체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2408@1.0/YoonChildfundkoreaManSeh.woff2' },
    ],
  },
  {
    id: 'cafe24',
    family: 'Cafe24Danjeonghae',
    label: 'Cafe24 단정해체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.1/Cafe24Danjunghae.woff' },
    ],
  },
  {
    id: 'hssummer',
    family: 'HsSummerWaterLight',
    label: 'HS 여름물빛체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_one@1.0/HSSummer.woff' },
    ],
  },
  {
    id: 'hakgyobunpil',
    family: 'SchoolSafetyChalk',
    label: '학교안심 분필체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2307-2@1.0/HakgyoansimBunpilR.woff2' },
    ],
  },
  {
    id: 'jejudoldam',
    family: 'JejuStoneWall',
    label: '제주 돌담체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2210-EF@1.0/EF_jejudoldam.woff2' },
    ],
  },
  {
    id: 'monaemoji',
    family: 'Mona12emoji',
    label: 'Mona 12 이모지',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2603-1@1.0/Mona12Emoji.woff2' },
    ],
  },
  {
    id: 'ria',
    family: 'Ria',
    label: '리아 산스 (ExtraBold)',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2410-1@1.0/RiaSans-ExtraBold.woff2' },
    ],
  },
  {
    id: 'yidstreet',
    family: 'Yidstreet',
    label: '이드스트리트체',
    sources: [
      { weight: 300, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2110@1.0/YdestreetL.woff2' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2110@1.0/YdestreetB.woff2' },
    ],
  },
  {
    id: 'kotrabold',
    family: 'KotraBold',
    label: 'KOTRA 볼드',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-10-21@1.1/KOTRA_BOLD-Bold.woff' },
    ],
  },
  {
    id: 'kotrahope',
    family: 'KotraHope',
    label: 'KOTRA HOPE',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2110@1.0/KOTRAHOPE.woff2' },
    ],
  },
  {
    id: 'gyeonggititle',
    family: 'GyeonggiMillenniumTitle',
    label: '경기천년 제목체',
    sources: [
      { weight: 300, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2410-3@1.0/Title_Light.woff' },
      { weight: 500, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2410-3@1.0/Title_Medium.woff' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2410-3@1.0/Title_Bold.woff' },
      { weight: 800, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2410-3@1.0/TitleV.woff' },
    ],
  },
  {
    id: 'gyeonggibatang',
    family: 'GyeonggiMillenniumBackground',
    label: '경기천년 바탕체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2410-3@1.0/Batang_Regular.woff' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2410-3@1.0/Batang_Bold.woff' },
    ],
  },
  {
    id: 'gangwonsaeum',
    family: 'GangwonEducationSaeum',
    label: '강원교육새음체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2201-2@1.0/GangwonEduSaeeum_OTFMediumA.woff' },
    ],
  },
  {
    id: 'beloved',
    family: 'BelovedMyoeunttobak',
    label: '그리운 묘은또박',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2601-1@1.0/Griun_Myoeunddobak-Rg.woff2' },
    ],
  },
  {
    id: 'nostalgicheullim',
    family: 'NostalgicMyoeunHeullim',
    label: '그리운 묘은흘림',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2601-1@1.0/Griun_MyoeunHeullim-Rg.woff2' },
    ],
  },
  {
    id: 'ssukssuk',
    family: 'Cafe24Ssukssuk',
    label: 'Cafe24 쑥쑥체',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.1/Cafe24Ssukssuk.woff' },
    ],
  },
  {
    id: 'freesentation',
    family: 'Presentation',
    label: 'Freesentation',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2404@1.0/Freesentation-4Regular.woff2' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2404@1.0/Freesentation-7Bold.woff2' },
      { weight: 800, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2404@1.0/Freesentation-8ExtraBold.woff2' },
    ],
  },
  {
    id: 'notosans',
    family: 'Noto Sans KR',
    label: '노토 산스 KR',
    sources: [
      { weight: 400, url: 'https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoySLPg9A.ttf' },
      { weight: 700, url: 'https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzg01SLPg9A.ttf' },
      { weight: 800, url: 'https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzmo1SLPg9A.ttf' },
    ],
  },
  {
    id: 'coldywebtoon',
    family: 'KoldiWebtoonMakerOngleifFont',
    label: '온글잎 콜디 웹툰메이커',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2508-2@1.0/Ownglyph_Coldywebtoonmaker-Rg.woff2' },
    ],
  },
  {
    id: 'shinbi7',
    family: 'ShinbiIsSevenYearsOld',
    label: '상상 신비는 일곱살',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_three@1.1/SangSangShinb7.woff' },
    ],
  },
  {
    id: 'goding',
    family: 'NotGothicButGoding',
    label: '고딕 아니고 고딩',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/naverfont_05@1.0/Gothic_Goding.woff' },
    ],
  },
  {
    id: 'byeoljari',
    family: 'SchoolSafetyConstellation',
    label: '학교안심 별자리',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimByeoljariTTF-L.woff2' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimByeoljariTTF-B.woff2' },
    ],
  },
  {
    id: 'surround',
    family: 'Cafe24Surround',
    label: 'Cafe24 써라운드',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24Ssurround.woff' },
    ],
  },
  {
    id: 'nadeuri',
    family: 'SchoolSafeOuting',
    label: '학교안심 나드리',
    sources: [
      { weight: 400, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimNadeuriTTF-L.woff2' },
      { weight: 700, url: 'https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimNadeuriTTF-B.woff2' },
    ],
  },
]

const loadedIds = new Set<string>()

/**
 * 선택한 폰트만 로드하고 font-family 값을 반환.
 * 'default'/미등록 id는 null (기본 스택 사용).
 */
export function ensureFontLoaded(id: string): string | null {
  const font = WIDGET_FONTS.find((f) => f.id === id)
  if (!font) return null
  if (!loadedIds.has(id)) {
    loadedIds.add(id)
    for (const source of font.sources) {
      try {
        const face = new FontFace(font.family, `url(${source.url})`, {
          weight: String(source.weight),
          display: 'swap',
        })
        void face.load().then((loaded) => document.fonts.add(loaded))
      } catch {
        // 폰트 로드 실패 — 기본 스택으로 표시
      }
    }
  }
  return font.family
}
