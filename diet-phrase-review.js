/* UI/UX writing review v1.0.0 · 2026-10-20. Browser-local editorial records. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id), key='maireport-diet-writing-reviews-v1';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const criteria=[
  ['clarity','쉽게 이해되는가','낯선 전문용어·비유·모호한 대상을 줄이고 한 번에 뜻이 읽히는지 확인합니다.'],
  ['action','실천할 행동이 구체적인가','무엇을, 언제, 어느 정도 할지 알 수 있고 한 번에 감당할 수 있는지 확인합니다.'],
  ['respect','부담 없이 선택할 수 있는가','명령·비난·죄책감·실패 낙인 없이 사용자의 상황과 선택권을 존중하는지 확인합니다.'],
  ['context','질문·답변·노출 상황에 맞는가','연결 질문, 끼니·시간대, 목표 단계, 제한 조건과 충돌하지 않는지 확인합니다.'],
  ['reason','이유가 행동을 납득시키는가','목표와 이유가 연결되고 효과를 단정하거나 사용자의 상태를 추정하지 않는지 확인합니다.'],
  ['consistency','용어·말투가 일관적인가','같은 뜻의 용어와 높임말·종결 표현을 주변 문구와 맞췄는지 확인합니다.']
 ];
 const statusNames={draft:'검토 중',revise:'수정 필요',hold:'추가 확인',approved:'적절함'};
 let data,selected,records={},memoryOnly=false,dirty=false;
 const mayLeave=()=>!dirty||window.confirm('저장하지 않은 검토 내용이 있습니다. 변경사항을 버리고 다른 문구를 여시겠어요?');
 const snapshot=p=>JSON.stringify([p.text,p.reason,p.full_text,p.question_ids,p.exposure,p.stage,p.nature,p.restriction_rule_ids,p.source_ids,p.evidence_raw,p.evidence_status,p.discrepancies,(p.question_ids||[]).map(id=>data.questions.find(q=>q.id===id)),data.disease_rules?.filter(r=>(p.restriction_rule_ids||[]).includes(r.id))]);
 function suggestions(p){
  const out=[],text=p.text||'',reason=p.reason||'',both=text+' '+reason;
  const add=(title,detail)=>out.push({title,detail});
  if(text.length>32)add('긴 목표 문구',`공백 포함 ${text.length}자입니다. 화면에서 잘리는지 확인하고 핵심 행동을 앞에 둡니다. 32자는 이 도구의 편집 참고 기준입니다.`);
  if(/적당|충분|제때|골고루|가볍게|뭐라도|조금|알맞/.test(text))add('행동의 기준이 모호할 수 있어요','사용자가 행동을 떠올릴 수 있는 예시나 시점을 보완합니다. 수량·시간은 근거와 제한 조건을 확인한 뒤 제안합니다.');
  if(/않기|지 말기|금지|반드시|무조건|꼭 |실패|잘못|참아|참기/.test(text))add('금지·압박 표현을 확인해 주세요','금지할 행동 대신 할 수 있는 행동으로 표현하고, 선택권과 예외 상황을 살핍니다.');
  if(/·|그리고|하면서|하고 |고,|및 /.test(text))add('여러 행동이 섞였는지 확인해 주세요','두 행동을 모두 해야 완료인지 모호할 수 있습니다. 한 번에 실천할 핵심 행동을 정합니다.');
  if(/혈당|대사|나트륨|포만|단백질류|정제|지질|인슐린/.test(both))add('낯선 용어를 확인해 주세요','대상 사용자에게 익숙한 말인지 살피고, 필요한 용어에는 짧은 생활 예시를 붙입니다.');
  if(/예방합니다|치료|완치|반드시|무조건|보장|정상화|해결됩니다/.test(reason))add('효과를 단정하는지 확인해 주세요','개인에게 효과를 보장하는 표현인지 검토합니다. 의학적 정확성과 적정성은 별도 근거 확인이 필요합니다.');
  if(/행동이에요[.!]?$/.test(reason.trim()))add('이유가 행동 설명에 그칠 수 있어요','목표를 다시 풀어 쓴 문장인지 확인합니다. 사용자가 이 행동을 선택할 이유를 근거 범위 안에서 설명합니다.');
  if(!reason.trim())add('이유 문구가 비어 있어요','이 행동이 왜 도움이 되는지 사용자가 이해할 수 있는 이유를 작성합니다.');
  if(p.evidence_status!=='LINKED')add('근거 확인이 필요해요','출처 연결이 충분하지 않습니다. 이유의 표현을 확정하기 전에 근거 원문과 적용 범위를 확인합니다.');
  if(p.discrepancies?.length)add('원본 간 문구 차이가 있어요','배포 문구와 데이터계약의 차이를 먼저 확인하고, 검토 기준 원문을 합의합니다.');
  return out;
 }
 function say(message){$('writing-message').textContent=message;}
 function load(){try{const value=JSON.parse(localStorage.getItem(key)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))records=value;}catch{memoryOnly=true;}}
 function persist(){try{localStorage.setItem(key,JSON.stringify(records));memoryOnly=false;return true;}catch{memoryOnly=true;return false;}}
 function recordStatus(p){const r=records[p.id];return r?(r.snapshot===snapshot(p)?statusNames[r.status]||'검토 중':'원문 변경 · 재검토'):'미검토';}
 function summary(){
  const count=data.phrases.filter(p=>records[p.id]).length,approved=data.phrases.filter(p=>recordStatus(p)==='적절함').length;
  $('writing-progress').textContent=`전체 ${data.phrases.length}개 · 기록 ${count}개 · 적절함 ${approved}개`;
 }
 function options(){
  const term=$('writing-search').value.trim().toLocaleLowerCase(),status=$('writing-filter').value;
  const items=data.phrases.filter(p=>(!term||(p.id+' '+p.text+' '+p.reason).toLocaleLowerCase().includes(term))&&(!status||(status==='unreviewed'?!records[p.id]:status==='stale'?recordStatus(p)==='원문 변경 · 재검토':records[p.id]?.status===status&&records[p.id]?.snapshot===snapshot(p))));
  $('writing-phrase').innerHTML='<option value="">문구를 선택해 주세요</option>'+items.map(p=>`<option value="${esc(p.id)}">[${esc(recordStatus(p))}] ${esc(p.id)} · ${esc(p.text)}</option>`).join('');
  if(selected&&items.some(p=>p.id===selected.id))$('writing-phrase').value=selected.id;
  $('writing-count').textContent=`선택 가능한 문구 ${items.length}개`;
 }
 function paint(p){
  selected=p;dirty=false;const r=records[p.id],stale=r&&r.snapshot!==snapshot(p),hints=suggestions(p);
  $('writing-editor').hidden=false;
  $('writing-current').innerHTML=`<div class="id-line"><code>${esc(p.id)}</code><span class="tag blue">${esc(recordStatus(p))}</span></div><h3>${esc(p.text)}</h3><p class="reason">${esc(p.reason||'이유 미기재')}</p><p class="detail-note">질문: ${esc((p.question_ids||[]).map(id=>data.questions.find(q=>q.id===id)?.text||id).join(' / ')||'직접 연결 없음')}</p><p class="detail-note">노출: ${esc(p.exposure?.raw_tag||'지정 없음')} · 단계: ${esc(data.meta.labels.stage?.[p.stage]||'지정 없음')}</p><a href="#${encodeURIComponent(p.id)}">원문·근거·적용 조건 상세 보기 ↑</a>${stale?'<p class="writing-warning">저장 이후 원문 또는 연결 조건이 바뀌었습니다. 이전 제안을 참고해 모든 기준을 다시 검토해 주세요.</p>':''}`;
  $('writing-hints').innerHTML=hints.length?`<p class="detail-note">자동 점검에서 ${hints.length}개 확인 후보를 찾았습니다. 문맥에 따라 적절한 표현일 수 있습니다.</p><ul>${hints.map(h=>`<li><strong>${esc(h.title)}</strong><p>${esc(h.detail)}</p></li>`).join('')}</ul>`:'<p>등록된 자동 점검 규칙에서 확인 후보를 찾지 못했습니다. 아래 6가지 기준으로 직접 검토해 주세요.</p>';
  $('writing-checks').innerHTML=criteria.map(([id,title,description])=>`<fieldset><legend>${esc(title)}</legend><p>${esc(description)}</p><div class="inline-actions">${[['','미확인'],['pass','적절'],['fail','보완 필요']].map(([value,title])=>`<label><input type="radio" name="writing-${id}" value="${value}" ${(stale?'':r?.checks?.[id]||'')===value?'checked':''}> ${title}</label>`).join('')}</div></fieldset>`).join('');
  $('writing-goal').value=r?.goal||'';$('writing-reason').value=r?.reason||'';$('writing-note').value=r?.note||'';$('writing-reviewer').value=r?.reviewer||'';
  $('writing-status').value=stale?'draft':r?.status||'draft';
  $('writing-save-state').textContent=r?`이전 기록: ${new Date(r.updated).toLocaleString('ko-KR')} · ${recordStatus(p)}`:'아직 저장한 검토 기록이 없습니다.';
  say('');preview();
 }
 function preview(){
  $('writing-preview-goal').textContent=$('writing-goal').value.trim()||selected?.text||'';
  $('writing-preview-reason').textContent=$('writing-reason').value.trim()||selected?.reason||'';
 }
 function save(event){
  event.preventDefault();if(!selected)return;
  const checks=Object.fromEntries(criteria.map(([id])=>[id,document.querySelector(`input[name="writing-${id}"]:checked`)?.value||''])),status=$('writing-status').value;
  if(status==='approved'&&Object.values(checks).some(value=>value!=='pass')){say('‘적절함’ 판정은 6가지 기준을 모두 ‘적절’로 확인한 뒤 저장할 수 있습니다.');return;}
  if(['revise','hold'].includes(status)&&!$('writing-note').value.trim()){say('수정 또는 추가 확인이 필요한 이유를 검토 의견에 적어 주세요.');$('writing-note').focus();return;}
  records[selected.id]={snapshot:snapshot(selected),original:{text:selected.text,reason:selected.reason},checks,status,goal:$('writing-goal').value.trim(),reason:$('writing-reason').value.trim(),note:$('writing-note').value.trim(),reviewer:$('writing-reviewer').value.trim(),updated:new Date().toISOString()};
  const saved=persist();dirty=false;summary();options();$('writing-save-state').textContent=`${recordStatus(selected)} · ${new Date().toLocaleString('ko-KR')}`;
  say(saved?'이 브라우저에 검토를 저장했습니다. 배포 원문은 그대로 유지됩니다.':'브라우저 저장 공간을 사용할 수 없어 현재 화면에만 보관 중입니다. 검토 기록을 내려받아 보관해 주세요.');
 }
 function download(){
  const rows=data.phrases.filter(p=>records[p.id]).map(p=>{const r=records[p.id];return [p.id,recordStatus(p),r.original?.text,r.original?.reason,p.text,p.reason,...criteria.map(([id])=>({pass:'적절',fail:'보완 필요'}[r.checks?.[id]]||'미확인')),r.goal,r.reason,r.note,r.reviewer,r.updated];});
  if(!rows.length){say('저장한 검토 기록이 없습니다. 문구를 선택하고 검토를 저장해 주세요.');return;}
  const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,m=>"'"+m).replace(/"/g,'""')+'"';
  const csv='\uFEFF'+[['문구 ID','검토 상태','검토 당시 목표','검토 당시 이유','현재 목표','현재 이유',...criteria.map(c=>c[1]),'목표 수정 제안','이유 수정 제안','검토 의견','검토자','저장 시각 (UTC)'],...rows].map(row=>row.map(cell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='maiReport_식이_문구검토_v1.0.0.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);say(`${rows.length}개 검토 기록을 내려받았습니다.`);
 }
 document.addEventListener('maireport:phrases-loaded',event=>{
  data=event.detail;load();$('writing-loading').hidden=true;$('writing-controls').hidden=false;summary();options();
  if(memoryOnly)say('브라우저 저장 공간을 읽지 못했습니다. 기록은 내려받아 보관해 주세요.');
 });
 document.addEventListener('click',event=>{const button=event.target.closest('[data-review-phrase]');if(!button||!data)return;const p=data.phrases.find(p=>p.id===button.dataset.reviewPhrase);if(!p||!mayLeave())return;$('writing-search').value='';$('writing-filter').value='';selected=p;options();paint(p);$('writing-workspace').scrollIntoView({block:'start'});$('writing-phrase').focus();});
 $('writing-search').addEventListener('input',options);$('writing-filter').addEventListener('change',options);
 $('writing-phrase').addEventListener('change',()=>{if(!mayLeave()){$('writing-phrase').value=selected?.id||'';return;}const p=data.phrases.find(p=>p.id===$('writing-phrase').value);if(p)paint(p);else{selected=null;$('writing-editor').hidden=true;}});
 $('writing-form').addEventListener('submit',save);
 ['writing-goal','writing-reason'].forEach(id=>$(id).addEventListener('input',preview));
 $('writing-editor').addEventListener('input',()=>{if(selected){dirty=true;$('writing-save-state').textContent='입력한 변경사항이 아직 저장되지 않았습니다.';}});
 addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 $('writing-export').addEventListener('click',download);
 addEventListener('storage',event=>{if(event.key===key){load();if(data){summary();options();say('다른 탭에서 검토 기록이 변경되었습니다. 문구를 다시 선택하면 최신 기록을 확인할 수 있습니다.');}}});
})();
