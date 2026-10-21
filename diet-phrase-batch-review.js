/* maiReport full-catalogue copy review · v2.0 · 2026-10-20 */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const STORE="maireport-diet-batch-review-v2";
 const VERSION="maireport-diet-batch-review-v1";
 const CRITERIA=[
  ["clarity","이해도","목표와 이유의 뜻이 쉽고 분명한가"],
  ["action","실천성","무엇을 어떻게 실천할지 알 수 있는가"],
  ["respect","존중성","비난·압박·과도한 금지 표현이 없는가"],
  ["context","맥락","질문·답변·단계·시간·제한 조건에 맞는가"],
  ["reason","이유","목표를 뒷받침하는 이유가 이해되고 과장되지 않는가"],
  ["consistency","일관성","용어·길이·말투가 앱 문구와 일관적인가"]
 ];
 const DECISIONS={revise:"표현 수정 권장",hold:"추가 확인",screened:"표현상 특이 신호 없음",accepted:"표현 검토 승인"};
 const ORIGINS={rules:"규칙 기반",ai:"AI 결과 가져옴"};
 const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const str=(value,max=5000)=>String(value??"").slice(0,max);
 const now=()=>new Date().toISOString();
 let data=null,results=new Map(),selected=new Set(),page=1,size=50,changed=false,loadedFromSave=false;
 const status=id=>results.get(id);
 const fingerprint=p=>JSON.stringify([p.id,p.version,p.text,p.reason,p.full_text,p.question_ids,p.exposure,p.stage,p.evidence_status,p.evidence_review?.review_state,p.discrepancies]);
 function evidencePending(p){
  const e=p.evidence_review;
  return p.evidence_status!=="LINKED"||!e||e.support_level==="UNVERIFIED"||!e.original_quote||/미확인|미대조|재검토|검토 전|검토 필요/.test([e.status,e.review_state,e.applicability].join(" "));
 }
 function screen(p){
  const checks=Object.fromEntries(CRITERIA.map(([key])=>[key,{state:"screened",reason:"규칙상 문제 신호가 탐지되지 않았습니다. 의미·문맥 적절성은 별도 확인이 필요합니다."}]));
  const issues=[];
  function flag(key,title,detail,severity){
   issues.push({criterion:key,title,detail,severity:severity||"hold"});
   if(checks[key].state!=="revise")checks[key].state=severity==="revise"?"revise":"hold";
   checks[key].reason=checks[key].reason.startsWith("규칙상")?title:title+" / "+checks[key].reason;
  }
  const text=p.text||"",reason=p.reason||"",combined=text+" "+reason;
  if(!text.trim())flag("clarity","목표 문구 누락","목표 문구 원본을 확인해 주세요.","revise");
  if([...text].length>=15)flag("clarity","목표 문구 15자 이상","짧은 모바일 카드의 글자 수·줄바꿈을 확인해 주세요.");
  if(/혈당|대사|나트륨|지질|인슐린|정제|포만|단백질류/.test(text))flag("clarity","전문용어 확인","일반 사용자에게 이해하기 쉬운 용어인지 확인해 주세요.");
  if(/추천:|[+/]|1\/2|½/.test(text))flag("clarity","축약·기호 표현","추천명·슬래시·더하기 기호가 사용자 행동으로 바로 읽히는지 확인해 주세요.");
  if(/적당|충분|제때|골고루|가볍게|뭐라도|조금|알맞/.test(text))flag("action","행동 기준 모호","실천 시점·양·대상이 명확한지 확인해 주세요.");
  if(/·|그리고|하면서|하고 |고,| 및 /.test(text))flag("action","복수 행동 가능성","한 번에 수행하는 목표인지 완료 기준을 확인해 주세요.");
  if(/않기|지 말기|금지|반드시|무조건|꼭 |실패|잘못|참아|참기/.test(text))flag("respect","금지·압박 어조","사용자의 선택권을 존중하는 긍정 행동 표현을 고려해 주세요.");
  if((p.discrepancies||[]).length)flag("context","배포·계약 원문 불일치","실제 노출 버전과 데이터계약의 차이를 먼저 해소해 주세요.","revise");
  const missing=(p.question_ids||[]).filter(id=>!data.questions.find(q=>q.id===id));
  if(missing.length)flag("context","질문 연결 누락",missing.join(", ")+" ID 연결을 확인해 주세요.","revise");
  if(p.exposure?.parse_status&&!["READY","VALID"].includes(p.exposure.parse_status))flag("context","노출 조건 점검","표시 조건 파싱 상태가 준비되지 않았습니다.","revise");
  if(p.runtime_selection_status==="REGISTERED_NOT_SELECTED")flag("context","선정 분기 미등록","등록 문구가 시뮬레이터에서 선택되는지 확인해 주세요.");
  if(!reason.trim())flag("reason","이유 문구 누락","목표를 납득할 수 있는 이유 문구가 필요합니다.","revise");
  if(/행동이에요[.!]?$/.test(reason.trim()))flag("reason","이유가 행동을 반복함","목표를 다시 설명하는 대신 실천 이유가 전달되는지 확인해 주세요.");
  if(/예방합니다|치료|완치|반드시|무조건|보장|정상화|해결됩니다/.test(reason))flag("reason","의학적 효과 단정","검증되지 않은 개인별 효능 보장이나 단정 표현을 사용하지 마세요.","revise");
  if(/혈당|혈압|나트륨|콜레스테롤|단백질|신장/.test(combined))flag("reason","건강 효과·용어 확인","권고의 대상과 효과에 맞는 의학적 근거 확인이 필요합니다.");
  if(/[!?]{2,}|[♡♥★☆]/.test(combined))flag("consistency","특수기호·말투 혼용","서비스의 다른 목표 및 이유 문구와 표현 방식을 맞춰 주세요.");
  if(/추천:|[+/]/.test(text))flag("consistency","축약 스타일 확인","목표형 문구와 추천형 문구의 구분을 확인해 주세요.");
  const decision=issues.some(i=>i.severity==="revise")?"revise":issues.length?"hold":"screened";
  const goalSuggestion=/거르지 않기$/.test(text)?text.replace(/거르지 않기$/,"챙겨 먹기"):"";
  return {
   id:p.id,signature:fingerprint(p),origin:"rules",decision,
   checks,issues,goalSuggestion,reasonSuggestion:"",rationale:issues.map(i=>i.title).join(" · ")||"표현 규칙상 탐지된 신호 없음. 최종 적절성 확인 전",
   medicalPending:evidencePending(p),reviewedAt:now(),manualDecision:false
  };
 }
 function list(){
  if(!data)return[];
  const term=$("batch-search").value.trim().toLocaleLowerCase();
  const decision=$("batch-filter-decision").value;
  const origin=$("batch-filter-origin").value;
  const all=data.phrases.filter(p=>{
   const r=status(p.id);
   if(term&&!(p.id+" "+p.text+" "+p.reason+" "+(r?.rationale||"")+" "+(r?.goalSuggestion||"")+" "+(r?.reasonSuggestion||"")).toLocaleLowerCase().includes(term))return false;
   if(decision&&(decision==="pending"?!r:decision==="medical"?!r?.medicalPending:r?.decision!==decision))return false;
   if(origin&&r?.origin!==origin)return false;
   return true;
  });
  return all.sort((a,b)=>{
   const order={revise:0,hold:1,screened:2,accepted:3};
   return (order[status(a.id)?.decision]??4)-(order[status(b.id)?.decision]??4);
  });
 }
 function message(text){$("batch-message").textContent=text;}
 function summary(){
  if(!data)return;
  const all=[...results.values()];
  const count=key=>all.filter(r=>r.decision===key).length;
  const ai=all.filter(r=>r.origin==="ai").length;
  const med=all.filter(r=>r.medicalPending).length;
  $("batch-total").textContent=all.length+"/"+data.phrases.length;
  $("batch-revise").textContent=count("revise");
  $("batch-hold").textContent=count("hold");
  $("batch-screened").textContent=count("screened")+count("accepted");
  $("batch-ai").textContent=ai;
  $("batch-medical").textContent=med;
  const active=all.length>0;
  ["batch-save","batch-csv","batch-json","batch-bulk-apply"].forEach(id=>$(id).disabled=!active);
  $("batch-run").textContent=active?"전체 문구 다시 검토":"전체 "+data.phrases.length+"개 일괄 검토";
  $("batch-selection-count").textContent="선택 "+selected.size+"개";
  $("batch-save-info").textContent=loadedFromSave&&!changed?"이 브라우저에 저장된 결과를 불러왔습니다.":changed?"변경사항이 있습니다. 전체 저장 버튼을 누르세요.":active?"일괄 검토 결과가 생성되었습니다.":"아직 일괄 검토를 실행하지 않았습니다.";
 }
 function criteriaMarkup(r){
  if(!r)return'<span class="batch-muted">일괄 검토 실행 전</span>';
  return '<div class="batch-criteria">'+CRITERIA.map(([key,label])=>{
   const state=r.checks?.[key]?.state||"hold";
   const reason=r.checks?.[key]?.reason||"상세 판정 없음";
   const css=state==="revise"?"bad":state==="hold"?"warn":"neutral";
   const symbol=state==="revise"?"수정":state==="hold"?"확인":"신호 없음";
   return '<span class="batch-criterion '+css+'" title="'+esc(reason)+'">'+esc(label)+' · '+symbol+'</span>';
  }).join("")+'</div>';
 }
 function rowMarkup(p){
  const r=status(p.id),checked=selected.has(p.id),cls=r?.decision||"";
  const check=checked?" checked":"";
  const decisionSelect=r?'<select data-batch-status="'+esc(p.id)+'" aria-label="'+esc(p.id)+' 판정">'+
   Object.entries(DECISIONS).map(([k,label])=>'<option value="'+k+'"'+(cls===k?" selected":"")+'>'+label+'</option>').join("")+'</select>':
   '<span class="batch-muted">검토 전</span>';
  const details=r?(r.issues||[]).length?'<details class="batch-issues"><summary>검토 사유 '+r.issues.length+'건</summary><ul>'+
   r.issues.map(item=>'<li><b>'+esc(item.title)+'</b> '+esc(item.detail)+'</li>').join("")+'</ul></details>':
   '<span class="batch-muted">규칙상 검출 항목 없음</span>':"";
  const goalInput=r?'<textarea data-batch-field="goalSuggestion" data-batch-id="'+esc(p.id)+'" aria-label="'+esc(p.id)+' 목표 수정 제안" rows="2" placeholder="필요 시 목표 수정안">'+esc(r.goalSuggestion)+'</textarea>':"";
  const reasonInput=r?'<textarea data-batch-field="reasonSuggestion" data-batch-id="'+esc(p.id)+'" aria-label="'+esc(p.id)+' 이유 수정 제안" rows="2" placeholder="필요 시 이유 수정안">'+esc(r.reasonSuggestion)+'</textarea>':"";
  const origin=r?'<span class="batch-origin">'+esc(ORIGINS[r.origin]||r.origin)+'</span>':"";
  return '<tr>'+
   '<td><input type="checkbox" data-batch-select="'+esc(p.id)+'"'+check+' aria-label="'+esc(p.id)+' 선택"></td>'+
   '<td><a href="#'+encodeURIComponent(p.id)+'" class="batch-id">'+esc(p.id)+'</a><strong>'+esc(p.text)+'</strong><p>'+esc(p.reason||"이유 미기재")+'</p>'+origin+'</td>'+
   '<td>'+criteriaMarkup(r)+details+'</td>'+
   '<td>'+decisionSelect+'<p class="batch-rationale">'+esc(r?.rationale||"")+'</p></td>'+
   '<td>'+goalInput+reasonInput+'</td>'+
   '<td><span class="batch-evidence '+(r?.medicalPending?"pending":"unknown")+'">'+(r?.medicalPending?"별도 검증 필요":"검증 상태 확인")+'</span></td>'+
   '</tr>';
 }
 function render(){
  if(!data)return;
  const items=list(),pages=Math.max(1,Math.ceil(items.length/size));
  page=Math.max(1,Math.min(page,pages));
  const shown=items.slice((page-1)*size,page*size);
  $("batch-table-body").innerHTML=shown.length?shown.map(rowMarkup).join(""):'<tr><td colspan="6" class="batch-empty">조회 조건에 맞는 문구가 없습니다.</td></tr>';
  $("batch-list-summary").textContent="검색 결과 "+items.length+"개 / 전체 "+data.phrases.length+"개 · "+page+"/"+pages+"페이지";
  $("batch-page-info").textContent=page+" / "+pages;
  $("batch-prev").disabled=page<=1;
  $("batch-next").disabled=page>=pages;
  $("batch-select-all").checked=items.length>0&&items.every(p=>selected.has(p.id));
  $("batch-select-all").indeterminate=items.some(p=>selected.has(p.id))&&!items.every(p=>selected.has(p.id));
  summary();
 }
 function persist(){
  try{
   localStorage.setItem(STORE,JSON.stringify({schema:VERSION,savedAt:now(),results:[...results.values()]}));
   changed=false;loadedFromSave=true;summary();return true;
  }catch(err){message("브라우저 저장 실패: CSV 또는 JSON으로 내려받아 기록을 보관해 주세요.");return false;}
 }
 function restore(){
  try{
   const raw=JSON.parse(localStorage.getItem(STORE)||"{}");
   if(raw.schema!==VERSION||!Array.isArray(raw.results))return;
   const ref=new Map(data.phrases.map(p=>[p.id,p]));
   let stale=0;
   for(const r of raw.results){
    const p=ref.get(r?.id);
    if(!p||r.signature!==fingerprint(p)){stale++;continue;}
    if(!r.checks||!DECISIONS[r.decision])continue;
    results.set(r.id,r);
   }
   loadedFromSave=results.size>0;
   if(stale)message("원문 또는 연결 조건이 변경된 "+stale+"건의 이전 검토 결과는 불러오지 않았습니다. 다시 일괄 검토해 주세요.");
  }catch(err){message("기존 검토 기록을 읽지 못했습니다. 필요한 경우 JSON 백업 파일을 확인해 주세요.");}
 }
 function run(){
  if(!data)return;
  if([...results.values()].some(r=>r.origin==="ai"||r.manualDecision||r.goalSuggestion||r.reasonSuggestion)&&!confirm("일괄 검토를 다시 실행하면 기존 AI 결과와 일괄 수정안이 규칙 기반 결과로 대체됩니다. 계속할까요?"))return;
  results=new Map(data.phrases.map(p=>[p.id,screen(p)]));
  selected.clear();page=1;changed=true;
  persist();render();
  message("전체 "+results.size+"개 문구의 6개 기준을 동시에 예비 검토하고 결과를 저장했습니다. 이 결과는 의미 기반 AI 심사나 의학적 승인 결과가 아닙니다.");
 }
 function applyBulk(){
  if(!selected.size){message("먼저 판정을 변경할 문구를 선택하세요. 상단 체크박스로 현재 검색·필터 전체를 선택할 수 있습니다.");return;}
  const decision=$("batch-bulk-decision").value;
  if(!DECISIONS[decision])return;
  if(decision==="accepted"){
   if(!confirm("선택한 "+selected.size+"개 문구를 ‘표현 검토 승인’으로 일괄 표시할까요? 이는 사용자가 문구를 직접 확인한 경우에만 적용해야 하며 의학적 권고 승인과는 별개입니다."))return;
  }else if(!confirm("선택한 "+selected.size+"개 문구의 판정을 ‘"+DECISIONS[decision]+"’으로 일괄 변경할까요?"))return;
  let applied=0;
  for(const id of selected){
   const r=status(id);if(!r)continue;
   r.decision=decision;r.manualDecision=true;r.reviewedAt=now();applied++;
  }
  selected.clear();changed=true;persist();render();
  message(applied+"건에 판정 ‘"+DECISIONS[decision]+"’을 일괄 적용하고 저장했습니다. 배포 문구 자체는 바뀌지 않습니다.");
 }
 const csvCell=value=>'"'+str(value,30000).replace(/^\s*[=+@-]/,m=>"'"+m).replace(/"/g,'""')+'"';
 function saveFile(filename,content,type){
  const url=URL.createObjectURL(new Blob([content],{type:type||"application/json;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function exportJson(){
  if(!results.size)return;
  saveFile("maiReport_식이_전체문구_일괄검토.json",JSON.stringify({schema:VERSION,savedAt:now(),results:[...results.values()]},null,2));
  message("전체 "+results.size+"건의 일괄 검토 결과를 JSON으로 내려받았습니다.");
 }
 function exportCsv(){
  if(!results.size)return;
  const header=["문구 ID","현재 목표","현재 이유","검토 방식","최종 표현 검토 판정",...CRITERIA.map(c=>c[1]+" 판정"),...CRITERIA.map(c=>c[1]+" 상세"),"검토 의견","목표 수정 제안","이유 수정 제안","의학 근거 별도 확인","원본 변경 감지용 서명","검토 시각"];
  const records=data.phrases.map(p=>{
   const r=status(p.id);
   return [p.id,p.text,p.reason,ORIGINS[r?.origin]||"",DECISIONS[r?.decision]||"미검토",...CRITERIA.map(([key])=>({revise:"수정 권장",hold:"추가 확인",screened:"규칙상 신호 없음",pass:"적절 후보"}[r?.checks?.[key]?.state]||"미판정")),...CRITERIA.map(([key])=>r?.checks?.[key]?.reason||""),r?.rationale||"",r?.goalSuggestion||"",r?.reasonSuggestion||"",r?.medicalPending?"필요":"개별 대조 확인",r?.signature||"",r?.reviewedAt||""];
  });
  const text="\uFEFF"+[header,...records].map(row=>row.map(csvCell).join(",")).join("\r\n");
  saveFile("maiReport_식이_전체문구_일괄검토.csv",text,"text/csv;charset=utf-8");
  message("전체 "+records.length+"개 문구의 기준별 판정·수정 제안·검토 상태를 CSV로 내려받았습니다.");
 }
 function aiRequest(){
  if(!data)return;
  const batches=[];
  for(let i=0;i<data.phrases.length;i+=40){
   batches.push({batch_index:batches.length+1,records:data.phrases.slice(i,i+40).map(p=>({
    id:p.id,source_goal:p.text,source_reason:p.reason,full_text:p.full_text,stage:p.stage,pool:p.pool,
    question_ids:p.question_ids,questions:(p.question_ids||[]).map(id=>data.questions.find(q=>q.id===id)?.text||id),
    exposure:p.exposure,restrictions:p.restriction_rule_ids,source_ids:p.source_ids,
    evidence_status:p.evidence_status,evidence_review:p.evidence_review?.status,
    original_discrepancies:p.discrepancies?.length||0
   }))});
  }
  const packet={
   schema:"maireport-diet-ai-review-request-v1",item_count:data.phrases.length,
   instructions:[
    "이 요청서의 모든 문구를 누락 없이 검토하되 출력 길이가 길면 batches 순서대로 결과를 분할하세요.",
    "목표 문구와 이유 문구를 함께 보며 6가지 기준으로 사용자 적절성을 개별 평가하고, 각 기준의 짧고 구체적인 이유를 쓰세요.",
    "조건부 권고·질환별 금기·노출 맥락을 검토하세요. 정보가 부족하면 pass가 아니라 hold로 기록하세요.",
    "15자 미만의 짧고 자연스러운 목표 문구를 우선하되 15자는 편집 가이드이지 절대적 의료 기준이 아닙니다.",
    "모호한 목표, 반복만 하는 이유, 부정적 어조, 단정·과장, 질환별 주의, 중복 표현을 점검하세요.",
    "근거 ID 연결만으로 임상 적합성이나 출처 원문 대조가 완료되었다고 판단하면 안 됩니다.",
    "과학적 근거가 부족한 효과, 임의의 영양 섭취량, 치료 조언을 만들어내지 마세요.",
    "판정은 pass, revise, hold 중 하나로 반환하세요. pass도 표현 적절 후보일 뿐 승인 상태는 아닙니다.",
    "반드시 JSON 파일로 반환하세요. 결과의 ID, 원문, 질문 맥락을 임의로 변경하지 마세요."
   ],
   criteria:CRITERIA.map(([id,label,question])=>({id,label,question})),
   output_schema:{schema:VERSION,results:[{id:"DIET-P-0001",decision:"hold",checks:Object.fromEntries(CRITERIA.map(([k])=>[k,{state:"hold",reason:"검토 판단 이유"}])),goal_suggestion:"",reason_suggestion:"",rationale:"검토 요약"}]},
   batches
  };
  saveFile("maiReport_식이_전체문구_AI일괄검토_요청서.json",JSON.stringify(packet,null,2));
  message("전체 "+data.phrases.length+"건을 40건씩 묶은 AI 검토 요청서를 내려받았습니다. AI가 반환한 결과 JSON은 ‘AI 결과 일괄 가져오기’에서 적용할 수 있습니다.");
 }
 const NORMALIZE={pass:"screened",approved:"screened",screened:"screened",revise:"revise",revision:"revise",hold:"hold",review:"hold",accepted:"screened"};
 function normalizeCheck(value){
  if(typeof value==="string")value={state:value,reason:"AI 검토 결과"};
  if(!value||typeof value!=="object")return {state:"hold",reason:"AI가 이 기준의 판단 근거를 제공하지 않았습니다."};
  return {state:NORMALIZE[value.state||value.rating||value.status]||"hold",reason:str(value.reason||value.rationale||"AI 판단 근거 미기재",700)};
 }
 async function importAiFiles(input){
  if(!data)return;
  const ref=new Map(data.phrases.map(p=>[p.id,p]));
  let added=0,ignored=0,errors=[],replaced=0;
  for(const file of Array.from(input.files||[])){
   let parsed;
   try{parsed=JSON.parse(await file.text());}catch(err){errors.push(file.name+": JSON 읽기 실패");continue;}
   const groups=Array.isArray(parsed)?parsed:Array.isArray(parsed?.results)?parsed.results:Array.isArray(parsed?.batches)?parsed.batches.flatMap(x=>x.results||[]):null;
   if(!Array.isArray(groups)){errors.push(file.name+": results 배열이 없습니다");continue;}
   const seen=new Set();
   for(const item of groups){
    const p=ref.get(item?.id);
    if(!p||seen.has(item.id)){ignored++;continue;}
    if(item.source_goal&&item.source_goal!==p.text){ignored++;continue;}
    if(item.source_reason&&item.source_reason!==p.reason){ignored++;continue;}
    seen.add(item.id);
    const rawDecision=item.decision||item.judgement||item.status;
    const decision=NORMALIZE[rawDecision]||"hold";
    const rawChecks=item.checks||item.criteria||{};
    const checks=Object.fromEntries(CRITERIA.map(([id])=>[id,normalizeCheck(rawChecks[id])]));
    const issues=CRITERIA.filter(([id])=>["revise","hold"].includes(checks[id].state)).map(([id,label])=>({criterion:id,title:label,detail:checks[id].reason,severity:checks[id].state}));
    const old=status(p.id);
    if(old?.origin==="ai")replaced++;
    results.set(p.id,{
     id:p.id,signature:fingerprint(p),origin:"ai",decision,checks,issues,
     goalSuggestion:str(item.goal_suggestion||item.suggested_goal||item.revised_goal||"",1000),
     reasonSuggestion:str(item.reason_suggestion||item.suggested_reason||item.revised_reason||"",2000),
     rationale:str(item.rationale||item.summary||"AI 검토 결과",2000),
     medicalPending:evidencePending(p),reviewedAt:now(),manualDecision:false
    });added++;
   }
  }
  input.value="";
  if(added){
   selected.clear();page=1;changed=true;
   persist();render();
  }
  message("AI 일괄 검토 결과 "+added+"건 적용"+(replaced?" (기존 AI 결과 교체 "+replaced+"건)":"")+" · 총 AI 검토 "+[...results.values()].filter(x=>x.origin==="ai").length+"/"+data.phrases.length+"건"+(ignored?" · 무효/중복 "+ignored+"건":"")+(errors.length?" · "+errors.join("; "):"")+". 이는 AI 제안이며 의학적·최종 문구 승인과 구분됩니다.");
 }
 document.addEventListener("maireport:phrases-loaded",e=>{
  data=e.detail;
  restore();render();
  if(!results.size)message("‘전체 문구 일괄 검토’를 누르면 "+data.phrases.length+"개가 모두 처리되며, 개별 문구를 하나씩 선택할 필요가 없습니다.");
 });
 $("batch-run").addEventListener("click",run);
 $("batch-save").addEventListener("click",()=>{if(persist())message("현재 일괄 검토 결과 "+results.size+"건을 이 브라우저에 한 번에 저장했습니다.");});
 $("batch-csv").addEventListener("click",exportCsv);
 $("batch-json").addEventListener("click",exportJson);
 $("batch-ai-request").addEventListener("click",aiRequest);
 $("batch-ai-import").addEventListener("change",e=>importAiFiles(e.target));
 ["batch-search","batch-filter-decision","batch-filter-origin"].forEach(id=>$(id).addEventListener(id==="batch-search"?"input":"change",()=>{page=1;selected.clear();render();}));
 $("batch-size").addEventListener("change",e=>{size=Number(e.target.value)||50;page=1;render();});
 $("batch-prev").addEventListener("click",()=>{page--;render();});
 $("batch-next").addEventListener("click",()=>{page++;render();});
 $("batch-select-all").addEventListener("change",e=>{const items=list();if(e.target.checked){items.forEach(p=>{if(status(p.id))selected.add(p.id);});}else{items.forEach(p=>selected.delete(p.id));}render();});
 $("batch-clear-selection").addEventListener("click",()=>{selected.clear();render();});
 $("batch-bulk-apply").addEventListener("click",applyBulk);
 $("batch-table-body").addEventListener("change",e=>{
  const checkbox=e.target.closest("[data-batch-select]");
  if(checkbox){checkbox.checked?selected.add(checkbox.dataset.batchSelect):selected.delete(checkbox.dataset.batchSelect);summary();return;}
  const select=e.target.closest("[data-batch-status]");
  if(select){
   const r=status(select.dataset.batchStatus);if(!r)return;
   if(select.value==="accepted"&&!confirm("이 문구를 직접 확인한 표현 검토 승인으로 표시할까요? 의학적 근거 승인이 아닙니다.")){select.value=r.decision;return;}
   r.decision=select.value;r.manualDecision=true;r.reviewedAt=now();changed=true;render();return;
  }
 });
 $("batch-table-body").addEventListener("input",e=>{
  const field=e.target.dataset.batchField,id=e.target.dataset.batchId;
  if(!field||!id||!["goalSuggestion","reasonSuggestion"].includes(field))return;
  const r=status(id);if(!r)return;
  r[field]=str(e.target.value,field==="goalSuggestion"?1000:2000);changed=true;summary();
 });
 addEventListener("beforeunload",e=>{if(changed){e.preventDefault();e.returnValue="";}});
})();