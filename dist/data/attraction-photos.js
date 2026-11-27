// A mapped photo shows the place itself or a view from its official lookout.
const localPhotos = {
  '도톤보리':'osaka',
  '시부야 스크램블 교차로':'tokyo',
  '오타루 운하':'city-2',
  '나카스':'fukuoka',
  '츄라우미 수족관':'okinawa',
  '가와구치코':'fuji',
  '나고야성':'nagoya',
  '시라카와고 합장촌':'city-27',
  '이쓰쿠시마 신사':'city-45',
  '긴잔온천':'city-9',
  '이나사야마':'nagasaki',
  '하코다테산 전망대':'hakodate',
  '리쓰린공원':'takamatsu',
  '도고온천':'matsuyama',
  '구마모토성':'kumamoto',
  '오도리공원':'city-1',
  '시로가네 청의 호수':'city-3',
  '고료카쿠':'city-5',
  '지옥계곡':'city-6',
  '즈이호덴':'city-7',
  '가조공원':'city-8',
  '네부타의 집 와랏세':'city-11',
  '센슈공원':'city-12',
  '주손지':'city-13',
  '쓰루가성':'city-14',
  '센소지':'city-15',
  '미나토미라이':'city-16',
  '고토쿠인':'city-17',
  '아시노코':'city-18',
  '닛코 도쇼구':'city-19',
  '나리타산 신쇼지':'city-20',
  '가와고에 구라즈쿠리 거리':'city-21',
  '구사쓰 온천 유바타케':'city-22',
  '가이라쿠엔':'city-23',
  '아라쿠라야마 센겐공원':'city-26',
  '겐로쿠엔':'city-29',
  '젠코지':'city-30',
  '핫포오네 스키장':'city-31',
  '반다이바시':'city-32',
  '미호노마쓰바라':'city-33',
  '간스이공원':'city-34',
  '후쿠이현립 공룡박물관':'city-35',
  '기요미즈데라':'city-37',
  '나라공원':'city-38',
  '고베 하버랜드':'city-39',
  '히메지성':'city-40',
  '와카야마성':'city-41',
  '히코네성':'city-42',
  '이세신궁':'city-43',
  '평화기념공원':'city-44',
  '센코지':'city-46',
  '고라쿠엔':'city-47',
  '돗토리 사구':'city-48',
  '이즈모타이샤':'city-49',
  '긴타이교':'city-50',
  '고치성':'city-54',
  '오호리공원':'city-56',
  '요시노가리 역사공원':'city-63',
  '아오시마 신사':'city-64',
  '센간엔':'city-65',
  '슈리성 공원':'city-66'
};

const aliases={
  '시라카와고 전통마을':'시라카와고 합장촌',
  '오기마치 합장촌':'시라카와고 합장촌',
  '아사쿠사 센소지':'센소지',
  '구사쓰 유바타케':'구사쓰 온천 유바타케',
  '온천 거리':'긴잔온천',
  '나라 사슴공원':'나라공원',
  '기타큐슈 모지코':'모지코 레트로'
};
import { tripImages } from './trip-images.js';
import { reviewedPhotos } from './reviewed-attraction-photos.js';

export function canonicalAttraction(name) {
  return Object.hasOwn(aliases,name)?aliases[name]:name;
}

export function attractionPhotos(name) {
  const key=canonicalAttraction(name);
  const gallery=Object.hasOwn(reviewedPhotos,key)?reviewedPhotos[key]:[];
  const local=Object.hasOwn(localPhotos,key)?tripImages[localPhotos[key]]:null;
  return [...(local?[local]:[]),...gallery];
}
