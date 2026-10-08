/* maiReport 식이 질문·목표 — 설계 기준 시뮬레이터 엔진
   기준: 데이터계약 원본(구현기준 R-01~R-09 · 설정 · 검증규칙) + 2026-10-07 설계 변경(단계: 최근 4건 중 3건)
   서버와 통신하지 않는다. 모든 계산은 브라우저 안에서 한다. */
(function (root) {
  'use strict';
  var DATA = {"source":"데이터계약 원본(SharePoint, 2026-10-08 수정본 · 목표문구 176건)","questions":[{"id":"DIET-Q-00","axis":"끼니 규칙","role":"FIXED","tpl":"{지난 끼니}은 평소만큼 드셨나요?"},{"id":"DIET-Q-01","axis":"채소","role":"ROTATING","tpl":"{지난 끼니}엔 채소 반찬을 얼마나 드셨나요?"},{"id":"DIET-Q-02","axis":"단 음료 · 단 간식","role":"ROTATING","tpl":"{지난 끼니} 전후 단 음료·간식은 몇 번이었나요?"},{"id":"DIET-Q-03","axis":"짠맛 · 국물","role":"ROTATING","tpl":"{지난 끼니}엔 국물을 얼마나 드셨나요?"},{"id":"DIET-Q-04","axis":"식사 시각","role":"ROTATING","tpl":"어젯밤 야식은 얼마나 드셨나요?"},{"id":"DIET-Q-05","axis":"식사 속도 · 양","role":"ROTATING","tpl":"{지난 끼니} 후 배부름은 어땠나요?"},{"id":"DIET-Q-06","axis":"단백질","role":"ROTATING","tpl":"{지난 끼니}엔 단백질류(고기·생선·달걀 등)를 드셨나요?"},{"id":"DIET-Q-07","axis":"기름진 음식","role":"ROTATING","tpl":"{지난 끼니}엔 튀긴 음식을 드셨나요?"},{"id":"DIET-Q-90","axis":"질환 확인","role":"CONFIRMATION","tpl":"{질환명}을 진단받았거나 관리 중이신가요?"}],"options":{"DIET-Q-00":[["usual","평소대로",1],["less","조금 적게",0],["very_little_or_skipped","거의 못 먹음",-1]],"DIET-Q-01":[["two_or_more","충분히 먹음",1],["one","조금 먹음",0],["none","먹지 않음",-1]],"DIET-Q-02":[["none","없었어요",1],["once","한 번",0],["twice_or_more","두 번 이상",-1]],"DIET-Q-03":[["none","먹지 않음",1],["half_or_less","절반 이하",0],["more_than_half","절반 넘게",-1]],"DIET-Q-04":[["none","먹지 않음",null],["light","조금 먹음",null],["meal_sized","배불리 먹음",null]],"DIET-Q-05":[["comfortable","편안했어요",1],["somewhat_full","조금 배불렀어요",0],["too_full","많이 배불렀어요",-1]],"DIET-Q-06":[["ate","먹었어요",1],["tasted_only","맛만 봤어요",0],["absent","안 먹었어요",-1]],"DIET-Q-07":[["absent","안 먹었어요",1],["tasted_only","맛만 봤어요",0],["ate","먹었어요",-1]],"DIET-Q-90":[["confirmed","네",null],["denied","아니요",null],["unknown","모르겠어요",null]]},"phrases":[{"id":"DIET-P-0001","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"INTRO","text":"아침에 뭐라도 한 입","reason":"먹을 수 있는 음식부터 식사를 시작해 보는 행동이에요.","nature":"INCREASE","time":"MORNING_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0002","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"BASE","text":"아침 거르지 않기","reason":"아침 식사를 챙기는 행동이에요.","nature":"INCREASE","time":"MORNING_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0003","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"BASE","text":"점심 · 저녁 챙기기","reason":"점심과 저녁 식사를 챙기는 행동이에요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0004","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"CHALLENGE","text":"세 끼 어제처럼 먹기","reason":"식사 시각을 일정하게 계획해 보는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0005","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"INTRO","text":"한 끼에 채소 하나","reason":"한 끼에 채소 반찬을 포함하는 행동이에요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0006","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"BASE","text":"채소 반찬 하나 더","reason":"채소 반찬을 한 가지 더 준비해 보는 행동이에요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0007","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"BASE","text":"저녁은 채소부터 먹기","reason":"채소 반찬부터 먹어 보는 행동이에요.","nature":null,"time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0008","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"CHALLENGE","text":"끼니마다 채소부터 먹기","reason":"각 끼니에서 채소를 먼저 먹어 보는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0009","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"INTRO","text":"한 잔은 물로 바꾸기","reason":"단 음료 한 번을 물로 바꾸는 행동이에요.","nature":"FLUID","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0010","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"BASE","text":"단 음료는 물로 바꾸기","reason":"설탕을 넣지 않은 음료로 바꾸는 행동이에요.","nature":"FLUID","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0011","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"BASE","text":"저녁 디저트 건너뛰기","reason":"추가 디저트를 먹을지 살펴보는 행동이에요.","nature":"FAST","time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0012","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"CHALLENGE","text":"오늘은 단 음료 없이","reason":"평소 마시던 단 음료를 쉬어 보는 행동이에요.","nature":"FAST","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0014","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"INTRO","text":"한 끼는 국물 반만","reason":"국물을 덜 먹으면 그 국물에 든 나트륨 섭취도 줄어요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0015","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"국물은 건더기 위주로","reason":"국물 섭취량을 줄이는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0016","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"한 끼는 싱겁게 먹기","reason":"추가하는 소금과 장의 양을 줄이는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0017","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"CHALLENGE","text":"나트륨 표시 보기","reason":"제품의 나트륨 표시를 비교해 고르는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0022","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"INTRO","text":"식사 중 수저 내려놓기","reason":"식사 중 잠깐 멈춰 먹는 속도를 살펴봐요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0023","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"BASE","text":"한 끼는 천천히 먹기","reason":"식사를 서두르지 않고 먹어 보는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0025","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"CHALLENGE","text":"먹으면서 배부름 살피기","reason":"식사 중 배부른 정도를 살펴보는 행동이에요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0027","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"INTRO","text":"조금이라도 단백질 먹기","reason":"단백질이 든 식품을 식사에 포함하는 행동이에요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0028","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"BASE","text":"반찬 하나는 단백질로","reason":"식사에 단백질 반찬이 있는지 살펴봐요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0029","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"CHALLENGE","text":"끼니마다 단백질 챙기기","reason":"각 끼니의 단백질 식품 구성을 살펴봐요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0030","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"INTRO","text":"튀긴 반찬은 하나만","reason":"튀긴 반찬의 종류와 먹는 양을 살펴봐요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0031","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"BASE","text":"간식은 견과류로","reason":"간식 종류를 바꿔 보는 행동이에요.","nature":"TEXTURE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0032","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"CHALLENGE","text":"고기 대신 생선으로","reason":"단백질 식품의 종류를 바꿔 보는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0033","pool":"RECOVERY","axis":null,"stage":null,"text":"다음 끼니는 챙기기","reason":"부족했던 섭취를 고려해 다음 식사를 챙겨요.","nature":"INCREASE","time":"EVENING","cal":"ANY","ad":true},{"id":"DIET-P-0034","pool":"RECOVERY","axis":null,"stage":null,"text":"단백질 한 입 먹기","reason":"단백질 식품만으로 한 끼가 충분하다고 판단하지 않아요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0035","pool":"RECOVERY","axis":null,"stage":null,"text":"간식이라도 챙겨 먹기","reason":"끼니를 적게 먹었다면 먹을 수 있는 간식을 살펴봐요.","nature":"INCREASE","time":"AFTERNOON_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0036","pool":"LOW_BURDEN","axis":null,"stage":null,"text":"늦은 시간, 카페인 줄이기","reason":"카페인에 민감하다면 늦은 시간 섭취를 줄여 볼 수 있어요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0037","pool":"LOW_BURDEN","axis":null,"stage":null,"text":"부담 없는 저녁 차리기","reason":"피곤한 날 먹을 수 있는 식사를 준비해요.","nature":null,"time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0039","pool":"LOW_BURDEN","axis":null,"stage":null,"text":"점심은 평소 양으로","reason":"평소 식사 계획에 맞춰 점심을 챙겨요.","nature":null,"time":"MORNING_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0040","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"INTRO","text":"아침에 우유 곁들이기","reason":"마실 것을 식사의 일부로 준비하는 행동이에요.","nature":"INCREASE","time":"MORNING_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0041","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"BASE","text":"점심 늦지 않게 먹기","reason":"일정에 맞춰 점심 먹을 시간을 확보해요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0042","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"CHALLENGE","text":"오늘 세 끼 챙기기","reason":"개인 식사 계획에 맞춰 끼니를 챙겨요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0044","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"INTRO","text":"국 대신 나물 반찬","reason":"국 대신 채소 반찬을 고르는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0045","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"INTRO","text":"고기와 쌈 채소 먹기","reason":"쌈 채소는 가장 쉽게 채소를 더하는 방법이에요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0046","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"BASE","text":"외식에도 채소 하나 더","reason":"외식할 때 채소 메뉴가 있는지 살펴봐요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0047","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"CHALLENGE","text":"끼니마다 채소 두 가지","reason":"끼니마다 채소 종류를 다양하게 골라 봐요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0048","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"CHALLENGE","text":"점심도 채소부터 먹기","reason":"저녁뿐 아니라 점심에도 순서를 바꿔 보는 단계예요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0049","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"INTRO","text":"시럽 · 크림 빼기","reason":"커피에 추가하는 시럽과 크림을 살펴봐요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0050","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"INTRO","text":"탄산음료 대신 탄산수","reason":"무가당 탄산수로 바꾸면 음료에 첨가된 당을 줄일 수 있어요.","nature":"FLUID","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0051","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"BASE","text":"요구르트는 무가당으로","reason":"제품 표시를 보고 첨가당을 확인해요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0053","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"CHALLENGE","text":"오늘은 단 간식 없이","reason":"추가 간식 여부는 개인 식사 계획에 맞춰요.","nature":"FAST","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0054","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"INTRO","text":"라면 국물은 남기기","reason":"라면 국물을 남겨 국물 섭취를 줄여요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0055","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"INTRO","text":"소스 없이 먹어보기","reason":"추가 소스 사용을 줄여 보는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0056","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"김치는 먹을 만큼만","reason":"김치의 양과 다른 짠 반찬을 함께 살펴봐요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0057","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"젓갈 · 장아찌 빼기","reason":"짠 절임 반찬을 다른 반찬으로 바꿔 봐요.","nature":"FAST","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0058","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"CHALLENGE","text":"소스는 따로 받기","reason":"따로 받으면 양을 내가 정할 수 있어요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0059","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"CHALLENGE","text":"오늘은 국물 없이 먹기","reason":"국물 섭취를 줄여 보는 행동이에요.","nature":"FAST","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0066","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"INTRO","text":"휴대폰 끄고 식사","reason":"식사에 집중할 수 있도록 화면을 잠시 꺼요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0070","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"INTRO","text":"아침에 달걀 하나","reason":"달걀을 아침 식사의 일부로 포함해 봐요.","nature":"INCREASE","time":"MORNING_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0071","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"INTRO","text":"우유 · 두유 한 잔","reason":"마시는 단백질은 반찬이 없어도 챙길 수 있어요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0072","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"BASE","text":"생선 반찬 한 끼","reason":"생선은 단백질과 좋은 지방을 함께 줘요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0073","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"BASE","text":"두부 반찬 준비하기","reason":"두부를 식사의 일부로 준비하는 행동이에요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0074","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"CHALLENGE","text":"끼니마다 단백질 바꾸기","reason":"단백질 식품을 다양하게 고르는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0075","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"INTRO","text":"튀김 대신 구이 · 찜","reason":"튀김 대신 구이·찜을 선택해 보는 행동이에요.","nature":"TEXTURE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0076","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"INTRO","text":"기름 적은 부위로 먹기","reason":"고기의 부위와 눈에 보이는 지방을 살펴봐요.","nature":"TEXTURE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0077","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"BASE","text":"드레싱은 반만","reason":"드레싱 양과 영양표시를 확인해요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0078","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"BASE","text":"라면 대신 국수 · 밥","reason":"면이나 밥의 조리법과 전체 식사 구성을 함께 살펴봐요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0079","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"CHALLENGE","text":"튀김 없는 하루","reason":"튀김 대신 다른 조리법을 선택해 봐요.","nature":"FAST","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0082","pool":"RECOVERY","axis":null,"stage":null,"text":"식사에 우유 한 잔","reason":"우유나 두유는 식사의 일부이며 한 끼 전체를 대신하지 않아요.","nature":"INCREASE","time":"AFTERNOON_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0083","pool":"LOW_BURDEN","axis":null,"stage":null,"text":"커피 대신 무카페인 차","reason":"카페인이 없는지 표시를 확인해요.","nature":"FLUID","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0087","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"BASE","text":"저녁은 가볍게 먹기","reason":"늦은 시간에도 개인 식사 계획에 맞게 먹어요.","nature":"INCREASE","time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0088","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"INTRO","text":"출근길에 아침 챙기기","reason":"집에서 못 먹었어도 아침은 챙길 수 있어요.","nature":"INCREASE","time":"MORNING_ENTRY","cal":"WEEKDAY","ad":false},{"id":"DIET-P-0089","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"CHALLENGE","text":"세 끼 평소대로 먹기","reason":"생활 일정에 맞춰 식사 시간을 계획해요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0093","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"BASE","text":"국에 채소 한 줌","reason":"국에 채소를 넣어도 총 나트륨 양이 저절로 줄지는 않아요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0094","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"CHALLENGE","text":"모든 끼니에 채소 넣기","reason":"각 끼니에 채소를 포함해 봐요. 총섭취량은 별도로 봐야 해요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0095","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"CHALLENGE","text":"저녁엔 채소 반찬 많이","reason":"접시에 채소를 함께 담는 행동이에요.","nature":null,"time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0100","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"CHALLENGE","text":"디저트는 나눠 먹기","reason":"디저트를 나눠 먹으며 섭취량을 살펴봐요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0102","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"INTRO","text":"찌개는 건더기만","reason":"앞접시로 옮기면 국물을 자연히 덜 먹게 돼요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0103","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"INTRO","text":"국은 반 그릇만 담기","reason":"담는 양을 줄이는 게 남기는 것보다 쉬워요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0104","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"짠 반찬은 한 가지만","reason":"한 끼에 짠 반찬이 겹치는지 살펴봐요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0105","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"볶음밥 대신 흰밥","reason":"밥과 반찬의 간을 각각 살펴봐요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0107","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"CHALLENGE","text":"김치는 접시에 덜기","reason":"김치의 실제 양과 전체 식사의 간을 함께 봐요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0110","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"BASE","text":"저녁 어제처럼 먹기","reason":"생활 일정에 맞춰 저녁 시각을 계획해요.","nature":null,"time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0114","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"INTRO","text":"한 숟갈 양을 절반으로","reason":"한 입의 양은 편하게 씹고 삼킬 수 있게 정해요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0115","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"BASE","text":"중간에 한 번 멈추기","reason":"중간에 멈추면 배부른지 확인할 틈이 생겨요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0118","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"CHALLENGE","text":"배부르면 잠깐 멈추기","reason":"먹는 중 배부른 정도를 확인해요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0119","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"INTRO","text":"간식은 삶은 달걀","reason":"달걀을 간식으로 선택해 보는 행동이에요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0121","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"BASE","text":"닭가슴살 · 살코기","reason":"단백질 식품을 고를 때 부위와 조리법을 살펴봐요.","nature":"TEXTURE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0122","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"BASE","text":"콩 반찬 하나 챙기기","reason":"콩은 고기 없이도 단백질을 채워요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0124","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"CHALLENGE","text":"저녁은 생선 · 두부로","reason":"생선·두부를 단백질 식품으로 선택해 봐요.","nature":null,"time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0126","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"INTRO","text":"볶음 대신 데친 반찬","reason":"데치면 기름이 거의 들어가지 않아요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0131","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"INTRO","text":"아침거리 꺼내 두기","reason":"아침에 고민할 일이 없으면 덜 거르게 돼요.","nature":null,"time":"EVENING","cal":"ANY","ad":true},{"id":"DIET-P-0136","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"CHALLENGE","text":"연휴에도 제때 먹기","reason":"연휴 일정에 맞춰 식사 시간을 계획해요.","nature":null,"time":"ANY","cal":"HOLIDAY_OR_EXTENDED","ad":false},{"id":"DIET-P-0139","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"BASE","text":"아침에도 채소 한 가지","reason":"아침 식사에 채소를 포함해 봐요.","nature":"INCREASE","time":"MORNING_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0141","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"CHALLENGE","text":"명절상 나물부터 먹기","reason":"명절 상엔 나물이 있으니 순서만 바꾸면 돼요.","nature":null,"time":"ANY","cal":"HOLIDAY","ad":false},{"id":"DIET-P-0146","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"BASE","text":"명절 음료는 무가당으로","reason":"명절에는 당이 든 음료 대신 물이나 무가당 음료를 선택해요.","nature":"FLUID","time":"ANY","cal":"HOLIDAY","ad":false},{"id":"DIET-P-0147","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"CHALLENGE","text":"달달한 커피 쉬기","reason":"매일 마시던 한 잔을 하루 빼 보는 단계예요.","nature":"FAST","time":"MORNING_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0148","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"CHALLENGE","text":"후식 없이 식사 마치기","reason":"디저트 여부는 개인 식사 계획에 맞춰요.","nature":"FAST","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0149","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"INTRO","text":"식탁에 소금 안 두기","reason":"손이 닿지 않으면 더 넣지 않게 돼요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0150","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"INTRO","text":"국은 마지막에 간하기","reason":"조리 마지막에 간을 확인해 추가 양을 조절해요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0153","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"CHALLENGE","text":"즉석식품 오늘은 쉬기","reason":"즉석식품의 영양표시와 실제 먹는 양을 살펴봐요.","nature":"FAST","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0154","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"CHALLENGE","text":"명절엔 국물 덜 먹기","reason":"명절 식사에서도 국물 섭취량을 살펴봐요.","nature":"FAST","time":"ANY","cal":"HOLIDAY","ad":false},{"id":"DIET-P-0156","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"INTRO","text":"저녁 후 부엌 정리","reason":"정리해 두면 다시 꺼내 먹기 번거로워져요.","nature":null,"time":"EVENING","cal":"ANY","ad":true},{"id":"DIET-P-0157","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"BASE","text":"주말 저녁도 제때 먹기","reason":"주말 일정에 맞춰 저녁 식사 시각을 계획해요.","nature":null,"time":"ANY","cal":"WEEKEND","ad":false},{"id":"DIET-P-0161","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"INTRO","text":"명절 음식 먹을 만큼만","reason":"명절 음식도 먼저 먹을 만큼 덜어 두면 실제 먹는 양을 확인하기 쉬워요.","nature":"REDUCE","time":"ANY","cal":"HOLIDAY","ad":false},{"id":"DIET-P-0165","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"INTRO","text":"저녁에 두부 한 가지","reason":"데우기만 하면 되는 단백질 반찬이에요.","nature":"INCREASE","time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0169","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"CHALLENGE","text":"아침 단백질까지 챙기기","reason":"아침 식사의 단백질 식품 구성을 살펴봐요.","nature":"INCREASE","time":"MORNING_ENTRY","cal":"ANY","ad":false},{"id":"DIET-P-0172","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"BASE","text":"기름 없이 굽기","reason":"조리 중 추가하는 기름 양을 살펴봐요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0173","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"BASE","text":"전 · 튀김은 한 접시","reason":"명절 음식의 양과 조리법을 살펴봐요.","nature":"REDUCE","time":"ANY","cal":"HOLIDAY","ad":false},{"id":"DIET-P-0180","pool":"RECOVERY","axis":null,"stage":null,"text":"편한 음식으로 한 끼","reason":"먹기 편한 음식을 고르되 염분과 전체 식사 구성을 함께 봐요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0181","pool":"RECOVERY","axis":null,"stage":null,"text":"먹을 수 있는 것 먹기","reason":"먹을 수 있는 음식부터 식사를 시작해 봐요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0182","pool":"LOW_BURDEN","axis":null,"stage":null,"text":"저녁에 익힌 채소 하나","reason":"채소만으로 한 끼가 충분하다고 판단하지 않아요.","nature":"INCREASE","time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0183","pool":"LOW_BURDEN","axis":null,"stage":null,"text":"늦은 저녁 국물 줄이기","reason":"늦은 식사의 국물 양을 살펴봐요. 증상 개선을 보장하지 않아요.","nature":"REDUCE","time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0198","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"CHALLENGE","text":"저녁 30분 당기기","reason":"조금씩 당기면 무리 없이 바뀌어요.","nature":"FAST","time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0199","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"CHALLENGE","text":"약속 날도 제때 먹기","reason":"약속이 있는 날이 가장 어려운 날이에요.","nature":null,"time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0200","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"CHALLENGE","text":"간식도 단백질로 챙기기","reason":"간식의 단백질 식품 구성을 살펴봐요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0201","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"CHALLENGE","text":"붉은 고기 없는 하루","reason":"다양한 단백질 식품을 고르되 개인 영양 필요를 고려해요.","nature":"FAST","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0202","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"CHALLENGE","text":"튀김 대신 굽거나 찌기","reason":"조리법만 바꿔도 기름이 크게 줄어요.","nature":"TEXTURE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0204","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"INTRO","text":"혼자여도 상 차려 먹기","reason":"식사를 준비해 먹는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0205","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"INTRO","text":"혼밥도 그릇에 덜기","reason":"봉지째 먹으면 양을 놓쳐요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0206","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"INTRO","text":"혼밥에도 채소 한 가지","reason":"혼자 먹을 때도 채소 반찬을 준비해 봐요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0207","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"INTRO","text":"혼밥에도 단백질 챙기기","reason":"간단한 식사에도 단백질 식품이 있는지 확인해요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0208","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"INTRO","text":"도시락에 채소 한 칸","reason":"미리 담아 두면 그날 채소가 확보돼요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0209","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"INTRO","text":"도시락에 달걀 하나","reason":"가장 손쉬운 단백질 한 가지예요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0210","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"도시락 국물은 빼기","reason":"국물 섭취량을 줄여 보는 행동이에요.","nature":"FAST","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0211","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"BASE","text":"도시락 반찬은 구이로","reason":"도시락 반찬의 조리법을 바꿔 보는 행동이에요.","nature":"TEXTURE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0212","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"BASE","text":"가족 반찬에 채소 하나","reason":"함께 먹는 반찬이 늘면 나도 늘어요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0213","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"국은 각자 그릇에 덜기","reason":"각자 덜어 실제 먹는 양을 살펴봐요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0214","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"BASE","text":"내 속도에 맞춰 먹기","reason":"다른 사람보다 자신의 씹기·삼키기 속도에 맞춰요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0215","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"INTRO","text":"냉면 국물은 반만","reason":"냉면 국물의 섭취량을 줄여 봐요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0217","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"INTRO","text":"국물 기름 걷어내기","reason":"떠 있는 기름만 걷어도 달라져요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0218","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"INTRO","text":"더운 날 물부터 마시기","reason":"갈증이 있을 때 개인 수분 계획에 맞춰 마셔요.","nature":"FLUID","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0219","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"INTRO","text":"식후 커피는 무가당으로","reason":"식후 음료에 첨가한 당을 확인해요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0220","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"INTRO","text":"목마르면 물부터 마시기","reason":"갈증과 배고픔을 같은 신호로 단정하지 않아요.","nature":"FLUID","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0222","pool":"RECOVERY","axis":null,"stage":null,"text":"조금씩 자주 나눠 먹기","reason":"적은 양도 먹기 어렵거나 섭취 부족이 이어지면 의료진과 상의해요.","nature":"INCREASE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0224","pool":"LOW_BURDEN","axis":null,"stage":null,"text":"저녁은 익숙한 음식으로","reason":"먹을 수 있는 익숙한 식사를 준비해요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0225","pool":"LOW_BURDEN","axis":null,"stage":null,"text":"저녁은 간단한 것으로","reason":"차리는 수고를 줄이는 것도 방법이에요.","nature":null,"time":"EVENING","cal":"ANY","ad":false},{"id":"DIET-P-0234","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"CHALLENGE","text":"마신 음료 적어 보기","reason":"오늘 무엇을 얼마나 마셨는지 적어 두면 다음에 고를 때 눈에 들어와요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0235","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"CHALLENGE","text":"음료는 당류 표시 보기","reason":"같은 종류라도 제품마다 당이 크게 달라요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0236","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"CHALLENGE","text":"마실 것 미리 정하기","reason":"미리 정해 두면 고르는 순간에 헤매지 않아요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0237","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"CHALLENGE","text":"한 입마다 수저 놓기","reason":"입문 단계의 한 번을 매 입으로 늘린 것이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0238","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"CHALLENGE","text":"세 끼 천천히 먹기","reason":"한 끼에서 세 끼로 넓히는 단계예요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0226","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"INTRO","text":"아침 먹을 자리 치우기","reason":"자리를 미리 치워 두면 내일 아침을 준비하기 수월해요.","nature":null,"time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0227","pool":"AXIS_STAGE","axis":"DIET-Q-00","stage":"BASE","text":"내일 아침 시각 정하기","reason":"시각을 정해 두면 내일 아침 끼니를 챙기기 쉬워요.","nature":null,"time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0228","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"INTRO","text":"채소 미리 씻어 두기","reason":"채소를 씻어 물기를 빼고 냉장해 두면 내일 바로 꺼낼 수 있어요.","nature":null,"time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0229","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"BASE","text":"장볼 때 채소 적기","reason":"적어 두면 장 볼 때 빠뜨리지 않아요.","nature":null,"time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0230","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"INTRO","text":"달걀 미리 삶아 두기","reason":"달걀을 삶아 식힌 뒤 냉장해 두면 내일 바로 꺼낼 수 있어요.","nature":null,"time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0231","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"BASE","text":"내일 쓸 두부 준비하기","reason":"두부를 냉장고에 두면 내일 준비할 재료를 미리 확인할 수 있어요.","nature":null,"time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0232","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"INTRO","text":"무카페인 차 꺼내 두기","reason":"미리 꺼내 두면 내일 마실 음료를 고르기 쉬워요.","nature":null,"time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0233","pool":"LOW_BURDEN","axis":null,"stage":null,"text":"내일 아침 미리 정하기","reason":"정해 두면 피곤한 아침에 고민이 줄어요.","nature":null,"time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0239","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"BASE","text":"먹을 양 먼저 정하기","reason":"먹기 전에 먹을 양을 정해 두는 행동이에요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0240","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"CHALLENGE","text":"꼭꼭 씹어 먹기","reason":"평소보다 더 씹어 보는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0241","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"CHALLENGE","text":"마가린·쇼트닝 빼기","reason":"트랜스지방이 많은 기름을 빼는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0242","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"CHALLENGE","text":"고기 기름 떼고 먹기","reason":"눈에 보이는 기름을 떼어 내는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0243","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"BASE","text":"포화지방 표시 보기","reason":"제품의 포화지방·트랜스지방 표시를 보는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0244","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"버섯·다시마로 맛내기","reason":"소금 대신 재료로 맛을 내는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0245","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"덜 짠 제품 고르기","reason":"같은 제품군에서 나트륨이 적은 것을 고르는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0246","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"BASE","text":"반찬 하나는 콩·두부로","reason":"반찬 하나를 콩이나 두부로 하는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0247","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"BASE","text":"간식도 당류 표시 보기","reason":"간식의 당류 표시를 보고 고르는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0248","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"INTRO","text":"세 끼 시간 정해 두기","reason":"끼니 시각을 미리 정해 두는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0249","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"INTRO","text":"아침 시간 정해 두기","reason":"아침을 먹는 시각을 정해 두는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0250","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"BASE","text":"야식도 그릇에 덜기","reason":"봉지째 먹지 않고 그릇에 덜어 먹는 행동이에요.","nature":null,"time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0251","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"CHALLENGE","text":"저녁 후 물 한 잔","reason":"저녁 뒤에 물을 한 잔 마셔 보는 행동이에요.","nature":"FLUID","time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0252","pool":"AXIS_STAGE","axis":"DIET-Q-05","stage":"BASE","text":"반찬은 먹을 만큼만","reason":"먹을 만큼만 덜어 담는 행동이에요.","nature":"REDUCE","time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0253","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"CHALLENGE","text":"버터 대신 올리브유","reason":"버터 대신 올리브유를 쓰는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0254","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"BASE","text":"무침은 들기름으로","reason":"무침에 들기름을 쓰는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0255","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"BASE","text":"마요 대신 머스터드","reason":"마요네즈 대신 머스터드를 쓰는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0256","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"CHALLENGE","text":"크림소스 대신 토마토","reason":"크림소스 대신 토마토소스를 고르는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0257","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"INTRO","text":"닭은 껍질 빼고","reason":"닭고기의 껍질을 빼고 먹는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0258","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"BASE","text":"가공육 대신 살코기","reason":"햄·소시지 대신 살코기를 고르는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0259","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"BASE","text":"간장 대신 식초·레몬","reason":"간장 대신 식초나 레몬으로 맛을 내는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0260","pool":"AXIS_STAGE","axis":"DIET-Q-03","stage":"INTRO","text":"소금 대신 후추·마늘","reason":"소금 대신 향신료로 맛을 내는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0262","pool":"AXIS_STAGE","axis":"DIET-Q-02","stage":"BASE","text":"시럽 대신 계피 가루","reason":"시럽 대신 계피 가루로 맛을 더하는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0263","pool":"AXIS_STAGE","axis":"DIET-Q-01","stage":"BASE","text":"드레싱은 조금만","reason":"드레싱 양을 줄여 보는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0264","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"INTRO","text":"주말도 아침 챙기기","reason":"주말에도 아침을 챙기는 행동이에요.","nature":null,"time":"ANY","cal":"WEEKEND","ad":false},{"id":"DIET-P-0265","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"BASE","text":"퇴근 후 바로 저녁","reason":"집에 오면 미루지 않고 저녁을 먹는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0266","pool":"AXIS_STAGE","axis":"DIET-Q-04","stage":"BASE","text":"늦은 끼니는 가볍게","reason":"늦게 먹는 끼니의 양을 줄여 보는 행동이에요.","nature":"REDUCE","time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0267","pool":"AXIS_STAGE","axis":"DIET-Q-06","stage":"CHALLENGE","text":"오징어·새우로 한 끼","reason":"고기 대신 해산물로 한 끼를 차리는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0268","pool":"AXIS_STAGE","axis":"DIET-Q-07","stage":"INTRO","text":"생선은 구이로","reason":"생선을 튀기지 않고 구워 먹는 행동이에요.","nature":null,"time":"ANY","cal":"ANY","ad":false},{"id":"DIET-P-0269","pool":"RECOVERY","axis":null,"stage":null,"text":"출출하면 가볍게 요기하기","reason":"저녁을 적게 먹어 허기가 지면 소화가 편한 음식을 조금 먹어요.","nature":"INCREASE","time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0270","pool":"RECOVERY","axis":null,"stage":null,"text":"따뜻한 우유나 두유 한 잔","reason":"따뜻한 음료로 속을 달래며 부족한 한 끼를 조금 채워요. 한 끼 전체를 대신하지는 않아요.","nature":"INCREASE","time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0271","pool":"RECOVERY","axis":null,"stage":null,"text":"내일 아침 챙길 것 준비하기","reason":"저녁을 적게 먹은 날은 내일 아침거리를 미리 준비해 둬요.","nature":"INCREASE","time":"PRE_MIDNIGHT","cal":"ANY","ad":true},{"id":"DIET-P-0272","pool":"RECOVERY","axis":null,"stage":null,"text":"입맛 없는 날 적어 두기","reason":"식욕이 떨어지는 때를 알면 식사를 챙기기 쉬워요.","nature":null,"time":"ANY","cal":"ANY","ad":true},{"id":"DIET-P-0273","pool":"RECOVERY","axis":null,"stage":null,"text":"식사 시간 정해 두기","reason":"시간이 일정하면 끼니를 놓치기 어려워요.","nature":null,"time":"ANY","cal":"ANY","ad":true}],"conditions":[{"code":"HYPERTENSION","name":"고혈압","status":"MAPPED","rule":"DX-02","link":["DIET-Q-03","DIET-Q-01"],"ban":[]},{"code":"DIABETES","name":"당뇨병","status":"MAPPED","rule":"DX-01","link":["DIET-Q-01","DIET-Q-02","DIET-Q-05"],"ban":["FAST","REDUCE"]},{"code":"DYSLIPIDEMIA","name":"이상지질혈증","status":"MAPPED","rule":"DX-03","link":["DIET-Q-07","DIET-Q-05"],"ban":[]},{"code":"CHRONIC_KIDNEY_DISEASE","name":"만성 신장질환","status":"SAFETY_ONLY","rule":"DX-05","link":[],"ban":["INCREASE","REDUCE","FLUID"]}],"decisions":"2026-10-07"};

  var CFG = {
    MEAL_1: 10 * 60, MEAL_2: 12 * 60, MEAL_3: 17 * 60, SESSION: 4 * 60,
    WINDOW_DAYS: 28, MIN_VALID: 3, BAD_RATIO: 0.5, GOOD_RATIO: 0.6, GOOD_BAD_MAX: 0.2,
    GOOD_RECENT: 7, GOOD_LOOKBACK: 84,
    CONSECUTIVE_AXIS_DAYS: 3, GOAL_RECENT_WINDOW_DAYS: 30,
    STAGE_UP_RECENT_GOALS: 4, STAGE_UP_MIN_COMPLETED: 3, STAGE_UP_MIN_ENDED: 3,
    STAGE_DOWN_CONSECUTIVE_INCOMPLETE: 2, STAGE_LOOKBACK_DAYS: 56
  };
  var STAGES = ['INTRO', 'BASE', 'CHALLENGE'];
  var STAGE_KO = { INTRO: '입문', BASE: '기본', CHALLENGE: '도전' };
  var STATE_KO = { OBSERVING: '관찰 중', AVERAGE: '보통', NEEDS_WORK: '개선 필요', GOOD: '양호' };
  var FIXED = 'DIET-Q-00', NIGHT_SNACK = 'DIET-Q-04';
  var QMAP = {}; DATA.questions.forEach(function (q) { QMAP[q.id] = q; });
  var CMAP = {}; DATA.conditions.forEach(function (c) { CMAP[c.code] = c; });
  var ROTATING = DATA.questions.filter(function (q) { return q.role === 'ROTATING'; }).map(function (q) { return q.id; });
  var STATE_AXES = [FIXED].concat(ROTATING.filter(function (q) { return q !== NIGHT_SNACK; }));
  var ALL_AXES = [FIXED].concat(ROTATING);

  /* ── 날짜·시각 ── */
  function addDays(d, n) { var t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function diffDays(a, b) { return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000); }
  function minutes(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function band(t) { var m = minutes(t); return m < CFG.SESSION ? 'NIGHT' : m < CFG.MEAL_1 ? 'MORNING' : m < CFG.MEAL_2 ? 'LATE_MORNING' : m < CFG.MEAL_3 ? 'AFTERNOON' : 'EVENING'; }
  /* 지난 끼니 (R-02 · V-30). 00~04시는 세션 날짜의 다음 실제 날짜 새벽이고, 어제 저녁 = 세션 날짜의 저녁 */
  function mealOf(date, t) {
    var b = band(t);
    if (b === 'NIGHT') return { date: date, type: 'DINNER', label: '어제 저녁' };
    if (b === 'MORNING') return { date: addDays(date, -1), type: 'DINNER', label: '어제 저녁' };
    if (b === 'LATE_MORNING') return { date: date, type: 'BREAKFAST', label: '오늘 아침' };
    if (b === 'AFTERNOON') return { date: date, type: 'LUNCH', label: '오늘 점심' };
    return { date: date, type: 'DINNER', label: '오늘 저녁' };
  }
  function targetOf(t) {
    var b = band(t);
    return b === 'MORNING' ? { type: 'BREAKFAST', label: '오늘 아침' } : b === 'LATE_MORNING' ? { type: 'LUNCH', label: '오늘 점심' } :
      b === 'AFTERNOON' ? { type: 'DINNER', label: '오늘 저녁' } : { type: 'TONIGHT', label: '오늘 밤' };
  }
  function actualDate(date, t) { return band(t) === 'NIGHT' ? addDays(date, 1) : date; }
  function isWeekend(d) { var w = new Date(d + 'T00:00:00Z').getUTCDay(); return w === 0 || w === 6; }

  /* ── 사용자 상태 ── */
  function linkedAxes(u) { var out = []; u.conds.forEach(function (c) { (CMAP[c].link || []).forEach(function (q) { if (out.indexOf(q) < 0) out.push(q); }); }); return out; }
  function banSet(u) { var s = {}; u.conds.forEach(function (c) { (CMAP[c].ban || []).forEach(function (n) { s[n] = 1; }); }); return s; }

  /* ── 축 상태 (CFG-002~009). before: 이 날짜 이전(미포함)까지만 본다 ── */
  function axisAnswers(u, qid, uptoDate, inclusive) {
    return u.answers.filter(function (a) { return a.qid === qid && a.score !== null && (inclusive ? a.date <= uptoDate : a.date < uptoDate); });
  }
  function axisState(u, qid, date, inclusive) {
    var all = axisAnswers(u, qid, date, inclusive);
    var win = all.filter(function (a) { return diffDays(date, a.date) <= CFG.WINDOW_DAYS; });
    var n = win.length;
    if (n < CFG.MIN_VALID) return { state: 'OBSERVING', n: n };
    var bad = win.filter(function (a) { return a.score < 0; }).length;
    if (bad / n >= CFG.BAD_RATIO) return { state: 'NEEDS_WORK', n: n };
    var rec = all.filter(function (a) { return diffDays(date, a.date) <= CFG.GOOD_LOOKBACK; }).slice(-CFG.GOOD_RECENT);
    if (rec.length >= CFG.GOOD_RECENT) {
      var g = rec.filter(function (a) { return a.score > 0; }).length, b = rec.filter(function (a) { return a.score < 0; }).length;
      if (g / rec.length >= CFG.GOOD_RATIO && b / rec.length < CFG.GOOD_BAD_MAX) return { state: 'GOOD', n: n };
    }
    return { state: 'AVERAGE', n: n };
  }
  function snapshots(u) {
    var d = cur(u);
    return STATE_AXES.map(function (q) { var s = axisState(u, q, d.date, true); return { qid: q, axis: QMAP[q].axis, state: s.state, answers: s.n }; });
  }

  /* ── 회전 질문 축 선정 (R-09 · CFG-041 · CFG-018) ── */
  function answerCount28(u, qid, date) { return u.answers.filter(function (a) { return a.qid === qid && a.date < date && diffDays(date, a.date) <= CFG.WINDOW_DAYS; }).length; }
  function lastAsked(u, qid) { for (var i = u.days.length - 2; i >= 0; i--) { var r = rot(u.days[i]); if (r && r.qid === qid) return u.days[i].date; } return ''; }
  function streak(u, qid) { var n = 0, next = cur(u).date; for (var i = u.days.length - 2; i >= 0; i--) { var r = rot(u.days[i]); if (r && r.qid === qid && diffDays(next, u.days[i].date) === 1) { n++; next = u.days[i].date; } else break; } return n; }
  function rot(day) { return day.q.filter(function (x) { return x.slot === 'ROTATING'; })[0] || null; }
  function fix(day) { return day.q.filter(function (x) { return x.slot === 'FIXED'; })[0] || null; }
  function order(u, list, date) {
    return list.slice().sort(function (a, b) {
      var ca = answerCount28(u, a, date), cb = answerCount28(u, b, date); if (ca !== cb) return ca - cb;
      var la = lastAsked(u, a), lb = lastAsked(u, b); if (la !== lb) return la < lb ? -1 : 1;
      return a < b ? -1 : 1;
    });
  }
  function pickRotating(u, day) {
    var snackOk = band(day.time) === 'MORNING';
    var avail = ROTATING.filter(function (q) { return q !== NIGHT_SNACK || snackOk; });
    var blocked = avail.filter(function (q) { return streak(u, q) >= CFG.CONSECUTIVE_AXIS_DAYS; });
    var ok = function (q) { return blocked.indexOf(q) < 0; };
    var linked = linkedAxes(u).filter(function (q) { return avail.indexOf(q) >= 0; });
    var note = blocked.length ? '같은 축 연속 ' + CFG.CONSECUTIVE_AXIS_DAYS + '일 제한으로 제외: ' + blocked.map(function (q) { return QMAP[q].axis; }).join(', ') : '';
    if (!linked.length) { var all = order(u, avail.filter(ok), day.date); return { qid: all[0], group: 'ALL', note: note }; }
    var remaining = linked.filter(function (q) { return u.cycle.indexOf(q) < 0; });
    if (remaining.length) {
      var c = remaining.filter(ok); if (!c.length) c = linked.filter(ok);
      if (c.length) return { qid: order(u, c, day.date)[0], group: 'LINKED', note: note };
    }
    var general = order(u, avail.filter(function (q) { return linked.indexOf(q) < 0; }).filter(ok), day.date);
    if (general.length) return { qid: general[0], group: 'GENERAL', note: note };
    return { qid: order(u, linked, day.date)[0], group: 'LINKED', note: note };
  }

  /* ── 질문 ── */
  function qText(qid, meal) { return QMAP[qid].tpl.replace('{지난 끼니}', meal.label); }
  function reuse(u, qid, meal) { return u.answers.filter(function (a) { return a.qid === qid && a.mealDate === meal.date && a.mealType === meal.type; })[0] || null; }
  function makeQ(u, day, slot, qid, extra) {
    var q = { slot: slot, qid: qid, axis: QMAP[qid].axis, text: qText(qid, day.meal), state: 'PENDING', code: null, label: null, score: null, reused: false };
    if (extra) for (var k in extra) q[k] = extra[k];
    var r = reuse(u, qid, day.meal);
    if (r) { q.state = 'ANSWERED'; q.code = r.code; q.label = r.label; q.score = r.score; q.reused = true; }
    return q;
  }
  function afterFixed(u, day) {
    var f = fix(day);
    if (f.code === 'very_little_or_skipped') { day.skipRotating = '고정 질문 답이 「' + f.label + '」이라 회전 질문을 내지 않음'; finish(u, day); return; }
    var p = pickRotating(u, day);
    var q = makeQ(u, day, 'ROTATING', p.qid, { group: p.group, note: p.note });
    day.q.push(q);
    if (p.group === 'GENERAL') u.cycle = [];
    if (q.state === 'ANSWERED') { markCycle(u, q); finish(u, day); }
  }
  function markCycle(u, q) { if (linkedAxes(u).indexOf(q.qid) >= 0 && u.cycle.indexOf(q.qid) < 0) u.cycle.push(q.qid); }
  function options(qid) { return DATA.options[qid].map(function (o) { return { code: o[0], label: o[1], score: o[2] === undefined ? null : o[2] }; }); }

  /* ── 목표 선정 ── */
  function phraseOk(u, day, p) {
    if (p.nature && banSet(u)[p.nature]) return false;
    var b = band(day.time), ad = actualDate(day.date, day.time);
    if (p.cal === 'WEEKDAY' && isWeekend(ad)) return false;
    if (p.cal === 'WEEKEND' && !isWeekend(ad)) return false;
    if (p.cal === 'HOLIDAY' || p.cal === 'HOLIDAY_OR_EXTENDED') return false; /* 명절 날짜 목록 없음 → 제외 (R-08) */
    if (b === 'EVENING') return p.ad && (p.time === 'EVENING' || p.time === 'PRE_MIDNIGHT' || p.time === 'ANY');
    if (b === 'NIGHT') return p.ad && (p.time === 'EVENING' || p.time === 'ANY'); /* 자정 뒤에도 날짜 표현이 맞는 문구 (R-05) */
    if (p.time === 'ANY') return true;
    if (p.time === 'MORNING_ENTRY') return b === 'MORNING';
    if (p.time === 'AFTERNOON_ENTRY') return b === 'AFTERNOON';
    return false;
  }
  /* 반복 방지 (V-45 · CFG-065) */
  function pickPhrase(u, day, cands) {
    if (!cands.length) return null;
    var last = {}; u.exposures.forEach(function (e) { if (e.date < day.date) last[e.pid] = e.date; });
    var fresh = cands.filter(function (p) { return !last[p.id] || diffDays(day.date, last[p.id]) > CFG.GOAL_RECENT_WINDOW_DAYS; });
    if (fresh.length) return fresh.sort(function (a, b) { return a.id < b.id ? -1 : 1; })[0];
    return cands.slice().sort(function (a, b) { return last[a.id] !== last[b.id] ? (last[a.id] < last[b.id] ? -1 : 1) : (a.id < b.id ? -1 : 1); })[0];
  }
  function endedAxisGoals(u, qid, day) {
    var st = u.stage[qid] || { stage: 'INTRO', since: '' };
    var out = [];
    for (var i = 0; i < u.days.length - 1; i++) {
      var d = u.days[i], g = d.goal;
      if (g && g.state === 'CREATED' && g.pool === 'AXIS_STAGE' && g.axisQid === qid && d.date >= st.since && diffDays(day.date, d.date) <= CFG.STAGE_LOOKBACK_DAYS) out.push({ date: d.date, done: g.done === true });
    }
    return out.reverse();
  }
  /* 단계 변경 (2026-10-07 설계 변경: 최근 4건 중 3건 완료 / 2건 연속 미완료) — 그날 질문 축 하나만, 하루 1회 */
  function evalStage(u, qid, day) {
    var st = u.stage[qid] || (u.stage[qid] = { stage: 'INTRO', since: '' });
    var g = endedAxisGoals(u, qid, day), i = STAGES.indexOf(st.stage), state = axisState(u, qid, day.date, false).state, ev = null;
    if (g.length >= CFG.STAGE_DOWN_CONSECUTIVE_INCOMPLETE && !g[0].done && !g[1].done && i > 0) {
      ev = { qid: qid, from: st.stage, to: STAGES[i - 1], why: '끝난 축 목표 최근 2건 연속 미완료' };
    } else if (g.length >= CFG.STAGE_UP_MIN_ENDED && i < 2) {
      var rec = g.slice(0, CFG.STAGE_UP_RECENT_GOALS), done = rec.filter(function (x) { return x.done; }).length;
      if (done >= CFG.STAGE_UP_MIN_COMPLETED) {
        if (state === 'OBSERVING') day.stageNote = '완료 ' + done + '/' + rec.length + '건이지만 축 상태가 관찰 중이라 단계를 올리지 않음';
        else if (state === 'NEEDS_WORK' && i >= 1) day.stageNote = '완료 ' + done + '/' + rec.length + '건이지만 개선 필요 축은 기본까지만';
        else ev = { qid: qid, from: st.stage, to: STAGES[i + 1], why: '끝난 축 목표 최근 ' + rec.length + '건 중 ' + done + '건 완료' };
      }
    }
    if (ev) { st.stage = ev.to; st.since = day.date; day.stageEvent = ev; }
    return st.stage;
  }
  function axisCandidates(u, day, qid, stage) {
    return DATA.phrases.filter(function (p) { return p.pool === 'AXIS_STAGE' && p.axis === qid && p.stage === stage && phraseOk(u, day, p); });
  }
  function selectGoal(u, day) {
    var f = fix(day), r = rot(day), tgt = targetOf(day.time), notes = [];
    function created(p, pool, axisQid, stage, sel) {
      u.exposures.push({ pid: p.id, date: day.date });
      return { state: 'CREATED', pid: p.id, text: p.text, reason: p.reason, pool: pool, stage: stage, axisQid: axisQid, axis: axisQid ? QMAP[axisQid].axis : null, target: tgt, sel: sel, done: null };
    }
    /* 1) 회복 목표: 고정 답이 「조금 적게」·「거의 못 먹거나 거름」이면 질문 축보다 먼저 */
    if (f.score !== null && f.score <= 0) {
      var rc = DATA.phrases.filter(function (p) { return p.pool === 'RECOVERY' && phraseOk(u, day, p); });
      var rp = pickPhrase(u, day, rc);
      if (rp) return created(rp, 'RECOVERY', null, null, '고정 질문 답: ' + f.label + ' → 회복 목표 우선');
      notes.push('회복 문구 중 금지·시간 조건을 통과한 것이 없음');
    }
    /* 2) 그날 질문 축 → 직접 선택 연결 축(선택 순서) → 일반 축(question_id 순) */
    var base = r && r.state === 'ANSWERED' ? r.qid : FIXED;
    var linked = linkedAxes(u).filter(function (q) { return q !== base; });
    var general = ALL_AXES.filter(function (q) { return q !== base && linked.indexOf(q) < 0; });
    var tiers = [[base], linked, general], tierName = ['그날 질문 축', '직접 선택 연결 축', '일반 축'];
    var baseStage = evalStage(u, base, day);
    for (var i = 0; i < tiers.length; i++) {
      var cands = [];
      tiers[i].forEach(function (qid) {
        var stage = qid === base ? baseStage : stageOf(u, qid);
        for (var s = STAGES.indexOf(stage); s >= 0; s--) { var c = axisCandidates(u, day, qid, STAGES[s]); if (c.length) { cands = cands.concat(c); break; } }
      });
      var p = pickPhrase(u, day, cands);
      if (p) {
        var qid = p.axis, cur0 = qid === base ? baseStage : stageOf(u, qid);
        var st = qid === NIGHT_SNACK ? null : axisState(u, qid, day.date, false).state;
        var sel = (r && r.state === 'ANSWERED' ? '오늘 회전 질문 축: ' + QMAP[base].axis : '오늘 질문 축: ' + QMAP[base].axis + ' (회전 질문 없음)') +
          (st ? '; 축 상태 ' + st : '') + '; 단계 ' + p.stage;
        if (i > 0) notes.push(QMAP[base].axis + ' 축에 통과 문구가 없어 ' + tierName[i] + '(' + QMAP[qid].axis + ')으로 내려감');
        if (p.stage !== cur0) notes.push(STAGE_KO[cur0] + ' 단계에 통과 문구가 없어 ' + STAGE_KO[p.stage] + ' 단계 문구 사용');
        if (day.stageEvent) notes.push('단계 변경: ' + QMAP[day.stageEvent.qid].axis + ' ' + STAGE_KO[day.stageEvent.from] + ' → ' + STAGE_KO[day.stageEvent.to] + ' (' + day.stageEvent.why + ')');
        if (day.stageNote) notes.push(day.stageNote);
        var g = created(p, 'AXIS_STAGE', qid, p.stage, sel); g.notes = notes; g.fallback = i > 0; return g;
      }
    }
    if (day.stageNote) notes.push(day.stageNote);
    return { state: 'GUIDANCE_ONLY', text: null, sel: '안전·시간·달력 조건을 통과한 목표 문구 없음', notes: notes, target: tgt, done: null };
  }
  function finish(u, day) { if (!day.goal) day.goal = selectGoal(u, day); }

  /* ── 공개 API ── */
  function cur(u) { return u.days[u.days.length - 1]; }
  function startDay(u, date, time) {
    var day = { date: date, time: time, meal: mealOf(date, time), q: [], goal: null };
    u.days.push(day);
    var f = makeQ(u, day, 'FIXED', FIXED);
    day.q.push(f);
    if (f.state === 'ANSWERED') afterFixed(u, day);
    return day;
  }
  function create(conds, startDate, time, id) {
    var u = { v: 1, id: id, conds: conds.slice(), created: new Date().toISOString(), days: [], answers: [], exposures: [], stage: {}, cycle: [] };
    startDay(u, startDate, time);
    return u;
  }
  function pending(u) { return cur(u).q.filter(function (q) { return q.state === 'PENDING'; })[0] || null; }
  function answer(u, code) {
    var day = cur(u), q = pending(u);
    if (!q) throw new Error('응답할 질문이 없습니다.');
    var o = options(q.qid).filter(function (x) { return x.code === code; })[0];
    if (!o) throw new Error('이 질문에 없는 선택지입니다.');
    q.state = 'ANSWERED'; q.code = o.code; q.label = o.label; q.score = o.score;
    u.answers.push({ qid: q.qid, date: day.date, mealDate: day.meal.date, mealType: day.meal.type, code: o.code, label: o.label, score: o.score });
    if (q.slot === 'FIXED') afterFixed(u, day); else { markCycle(u, q); finish(u, day); }
    return u;
  }
  function setDone(u, done) {
    var g = cur(u).goal;
    if (!g) throw new Error('질문을 모두 답한 뒤 목표를 확인하세요.');
    if (g.state !== 'CREATED') throw new Error('안내만 있는 목표는 달성으로 표시할 수 없습니다.');
    g.done = !!done; return u;
  }
  /* skip: 접속하지 않고 건너뛸 날 수(0이면 바로 다음 날). 건너뛴 날에는 세션이 만들어지지 않는다 */
  function nextDay(u, time, skip) {
    var day = cur(u);
    day.q.forEach(function (q) { if (q.state === 'PENDING') q.state = 'MISSED'; });
    day.closed = true;
    startDay(u, addDays(day.date, 1 + Math.max(0, skip | 0)), time);
    return u;
  }
  function stageOf(u, qid) { return u.stage[qid] ? u.stage[qid].stage : 'INTRO'; }

  root.DietSim = {
    DATA: DATA, CFG: CFG, STAGE_KO: STAGE_KO, STATE_KO: STATE_KO, QMAP: QMAP, CMAP: CMAP,
    create: create, answer: answer, setDone: setDone, nextDay: nextDay, cur: cur, pending: pending, options: options,
    snapshots: snapshots, band: band, stageOf: stageOf, linkedAxes: linkedAxes, rot: rot, fix: fix, addDays: addDays
  };
})(typeof window !== 'undefined' ? window : globalThis);
