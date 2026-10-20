/* Read-only view of the deployed dietary reference data. Selection logic stays in diet-sim-engine.js. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const filterIds=['axis','pool','stage','source','evidence','runtime'];
 const state={mode:'phrases',page:1,pageSize:20,loaded:false,data:null,filtered:[]};
 let questions=new Map(),sources=new Map(),diseases=new Map(),screening=new Map(),phrases=new Map();
 let labels={},searchTimer,statusTimer;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const list=value=>Array.isArray(value)?value:[];
 const label=(group,value,fallback='지정 없음')=>labels[group]?.[value]||value||fallback;
 const number=value=>Number(value||0).toLocaleString('ko-KR');
 const normalized=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g,' ').trim();
 const tag=(text,type='')=>`<span class="tag ${type}">${esc(text)}</span>`;
 function safeUrl(value){if(typeof value!=='string'||!value.trim())return null;try{const url=new URL(value,location.href);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}}
 function sourceLink(source){const url=safeUrl(source.url);return `<li>${url?`<a class="source-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(source.name)} <span aria-hidden="true">↗</span></a>`:`<span class="source-link">${esc(source.name)}</span>`}<span class="source-code">${esc(source.id)}</span></li>`;}
 function sourceNames(p){return list(p.source_ids).map(id=>sources.get(id)?.name||id);}
 function associatedQuestions(p){return list(p.question_ids).map(id=>questions.get(id)).filter(Boolean);}
 function optionMarkup(q,notes=false){return `<ul class="option-list">${list(q.options).map(o=>`<li>${esc(o.label)}<small>${o.score===null||o.score===undefined?'점수 없음':`${o.score>0?'+':''}${esc(o.score)}점`}</small>${notes?`<div class="detail-note"><code>${esc(o.code)}</code>${o.note?` · ${esc(o.note)}`:''}</div>`:''}</li>`).join('')}</ul>`;}
 function exposureSummary(p){const e=p.exposure||{};return [label('time',e.time),e.calendar&&e.calendar!=='ANY'?label('calendar',e.calendar):null,e.after_dinner?'식후 후보 가능':null].filter(Boolean);}
 function getPhraseSearch(p){return normalized([p.id,p.text,p.full_text,p.reason,p.evidence_raw,p.source_note,p.axis,label('pool',p.pool),label('stage',p.stage),label('nature',p.nature),p.exposure?.raw_tag,...sourceNames(p),...associatedQuestions(p).map(q=>`${q.id} ${q.axis} ${q.text}`),...list(p.disease_rule_ids).map(id=>diseases.get(id)?.name),...list(p.screening_metric_ids).map(id=>screening.get(id)?.name),...list(p.discrepancies).map(d=>d.contract_value)].join(' '));}
 function populateSelect(id,entries){const select=$(id);while(select.options.length>1)select.remove(1);for(const [value,text] of entries){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}}
 function updateMeta(){
  const d=state.data,c=d.meta.counts;
  $('stat-phrases').textContent=number(d.phrases.length);
  $('stat-candidate-note').textContent=`선정 후보 ${number(c.candidates)} · 등록만 ${number(c.registered_not_selected)}`;
  $('stat-questions').textContent=number(d.questions.length);
  $('stat-sources').textContent=number(d.sources.length);
  $('stat-review').textContent=number(c.evidence_free_text+c.evidence_missing);
  $('data-meta').innerHTML=`<span><b>문구·이유</b> 현재 배포된 시뮬레이터</span><span><b>근거·상세</b> 데이터계약 원본</span><span><b>원본 대조</b> 문구 차이 ${number(c.wording_discrepancies)}건</span>`;
  $('scope-details').innerHTML=`<p>${esc(d.meta.mapping_scope)}</p><p>${esc(d.meta.selection_scope)}</p><ul>${list(d.audits?.scope_notes).map(note=>`<li>${esc(note)}</li>`).join('')}</ul><p><b>문구 기준:</b> ${esc(d.meta.runtime_source)}</p><p>문구 내용·선정 규칙은 이 조회 화면에서 변경하지 않습니다. 원본 데이터 수정 후 생성 스크립트로 목록을 갱신합니다.</p>`;
 }
 function matchesPhrase(p,values,terms){
  if(values.axis&&(values.axis==='NONE'?!!p.axis:p.axis!==values.axis))return false;
  if(values.pool&&p.pool!==values.pool)return false;
  if(values.stage&&(values.stage==='NONE'?!!p.stage:p.stage!==values.stage))return false;
  if(values.source&&!list(p.source_ids).includes(values.source))return false;
  if(values.runtime&&p.runtime_selection_status!==values.runtime)return false;
  if(values.evidence==='REVIEW'&&p.evidence_status==='LINKED')return false;
  if(values.evidence==='DISCREPANCY'&&!list(p.discrepancies).length)return false;
  if(values.evidence&&!['REVIEW','DISCREPANCY'].includes(values.evidence)&&p.evidence_status!==values.evidence)return false;
  return terms.every(term=>p._search.includes(term));
 }
 function evidenceMarkup(p){
  const linked=list(p.source_ids).map(id=>sources.get(id)||{id,name:id});
  const raw=String(p.evidence_raw||'').trim();
  const ids=new Set(list(p.source_ids).map(String));
  const isIdOnly=raw&&raw.split(/[\\s,;|/]+/).filter(Boolean).every(token=>ids.has(token));
  const registeredText=raw&&!isIdOnly;
  return `${linked.length?`<ul class="evidence-list">${linked.map(sourceLink).join('')}</ul>`:''}
   ${linked.length?`<div class="evidence-meaning"><b>출처의 등록 범위</b><p>${esc(linked.map(source=>source.usage||'출처 범위 설명 미등록').join(' / '))}</p></div>`:''}
   <div class="evidence-meaning"><b>이 문구의 근거 등록 내용</b>
   <p>${registeredText?esc(raw):'권고 원문·절·페이지 미등록 — 출처 링크에서 세부 내용을 확인해야 합니다.'}</p>
   ${registeredText?'<small>데이터계약에 저장된 근거 설명이며, 원문 직접 인용 또는 개별 권고 검증 완료를 의미하지 않습니다.</small>':'<small>출처명만 연결된 상태입니다. 위의 출처 범위 설명도 이 문구에 직접 대응하는 권고 인용은 아닙니다.</small>'}
   </div><div class="evidence-status">${tag(label('evidence_status',p.evidence_status),p.evidence_status==='LINKED'?'green':p.evidence_status==='MISSING'?'red':'amber')}</div>`;
 }
 function connectionMarkup(p){
  const qs=associatedQuestions(p),recovery=p.question_link_type==='RECOVERY_BRANCH';
  if(!qs.length)return `${tag('특정 질문 연결 없음')}<p class="question-title">${esc(label('pool',p.pool))} 문구 묶음</p><p class="connection-caption">현재 엔진에 등록되어 있으나 이 문구 묶음의 선정 분기는 없습니다.</p>`;
  const q=qs[0];
  const triggers=list(p.trigger_option_codes).map(code=>list(q.options).find(o=>o.code===code)?.label||code);
  return `<div class="id-line"><code>${esc(q.id)}</code>${tag(recovery?'회복 분기':q.axis,'blue')}</div><p class="question-title">${esc(q.text)}</p><p class="connection-caption">${recovery?`<b>${esc(triggers.join(' / '))}</b> 응답 시 회복 목표 후보`:`${esc(label('stage',p.stage))} 단계의 목표 후보 · 응답과 문구의 고정 1:1 연결은 아님`}</p>`;
 }
 function phraseDetails(p){
  const qs=associatedQuestions(p),e=p.exposure||{},linked=list(p.source_ids).map(id=>sources.get(id)).filter(Boolean);
  const diseaseRules=list(p.disease_rule_ids).map(id=>diseases.get(id)).filter(Boolean);
  const screeningRules=list(p.screening_metric_ids).map(id=>screening.get(id)).filter(Boolean);
  const restrictions=list(p.restriction_rule_ids).map(id=>diseases.get(id)).filter(Boolean);
  const discrepancies=list(p.discrepancies);
  let html=`<section class="detail-box"><h4>목표 원문 · 관리 정보</h4><dl><dt>현재 적용 문구</dt><dd>${esc(p.text)}</dd><dt>상세 문구</dt><dd>${esc(p.full_text||'미기재')}</dd><dt>이유 문구</dt><dd>${esc(p.reason)}</dd><dt>버전 / 사용 상태</dt><dd>${esc(p.version)} / ${esc(p.status)}</dd><dt>선정 상태</dt><dd>${esc(label('runtime_selection_status',p.runtime_selection_status))}</dd></dl>${p.source_note?`<p class="detail-note">원본 메모: ${esc(p.source_note)}</p>`:''}</section>`;
  html+=`<section class="detail-box"><h4>근거 원문 · 출처 연결</h4><p class="raw value">${esc(p.evidence_raw||'근거 미기재')}</p><p class="detail-note">데이터계약의 evidence_raw 원문입니다. 출처 ID 연결은 권고문·장절·페이지 검증 완료를 뜻하지 않습니다.</p>${linked.length?`<ul class="rule-list">${linked.map(s=>`<li><strong>${esc(s.name)}</strong> <code>${esc(s.id)}</code><div>${esc(s.status||'')}</div><div class="inline-actions">${list(s.links).map(link=>{const url=safeUrl(link.url);return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ↗</a>`:'';}).join('')}</div></li>`).join('')}</ul>`:''}</section>`;
  if(discrepancies.length)html+=`<section class="detail-box full"><h4>${tag('원본 문구 차이','amber')} 현재 배포 문구와 데이터계약 대조</h4>${discrepancies.map(d=>`<dl><dt>현재 배포 문구</dt><dd>${esc(d.runtime_value)}</dd><dt>계약 원문</dt><dd>${esc(d.contract_value)}</dd><dt>대조 위치</dt><dd>${esc(d.contract_file)} · ${esc(d.sheet)} ${esc(d.row)}행</dd></dl>`).join('')}<p class="detail-note">이 화면은 현재 배포된 문구를 우선 표시하며, 원본 차이를 함께 남깁니다.</p></section>`;
  html+=`<section class="detail-box"><h4>질문·응답과의 연결</h4>${qs.length?qs.map(q=>`<p class="value"><code>${esc(q.id)}</code> ${esc(q.text)}</p>${optionMarkup(q)}<p class="detail-note">${esc(q.interpretation_limit||'')}</p>`).join(''):'<p>특정 질문 ID가 직접 연결되어 있지 않습니다.</p>'}<p class="detail-note">${esc(label('question_link_type',p.question_link_type))}${p.question_link_type==='AXIS_CANDIDATE'?'이며 실제 선택은 단계·안전·노출 조건 및 이력에 따릅니다.':'.'}</p></section>`;
  html+=`<section class="detail-box"><h4>노출 조건 · 문구 성격</h4><dl><dt>원본 노출 태그</dt><dd>${esc(e.raw_tag||'지정 없음')}</dd><dt>시간대</dt><dd>${esc(label('time',e.time))}</dd><dt>달력</dt><dd>${esc(label('calendar',e.calendar))}</dd><dt>문구 성격</dt><dd>${esc(label('nature',p.nature,'성격 지정 없음'))}</dd><dt>식후 후보</dt><dd>${e.after_dinner?'포함':'미포함'}</dd><dt>맥락 코드</dt><dd>${esc(list(e.context_codes).join(', ')||e.context||'지정 없음')}</dd>${p.screening_only?`<dt>검진 전용</dt><dd>${esc(p.screening_only)}</dd>`:''}</dl></section>`;
  if(diseaseRules.length||screeningRules.length)html+=`<section class="detail-box full"><h4>같은 식이 축에 연결된 질환·검진 규칙</h4><p class="detail-note">데이터계약의 축 연결표입니다. 개별 문구를 모든 해당 질환에 권고한다는 뜻은 아니며, 안전 제한과 적용 조건을 함께 확인해야 합니다.</p><ul class="rule-list">${diseaseRules.map(r=>`<li><strong>${esc(r.name)}</strong> <code>${esc(r.id)}</code> ${tag(r.in_simulator?'시뮬레이터 규칙 있음':'계약에 정의')}<div>${esc(r.note||r.ban_reason||'')}</div></li>`).join('')}${screeningRules.map(r=>`<li><strong>${esc(r.name)}</strong> <code>${esc(r.id)}</code> ${tag('계약의 검진 연결')}<div>${esc(r.note||'')} · 대상 구간: ${esc(list(r.eligible_bands).join(', '))}</div></li>`).join('')}</ul></section>`;
  if(restrictions.length)html+=`<section class="detail-box full"><h4>문구 성격에 연결된 제한 규칙</h4><p class="detail-note">데이터계약에서 ${esc(label('nature',p.nature))} 성격과 연결된 규칙입니다. 해당 질환 조건 및 금지 규칙이 적용될 때의 제한이며, 현재 사용자에게 적용된 결과를 뜻하지 않습니다.</p><ul class="rule-list">${restrictions.map(r=>`<li><strong>${esc(r.name)}</strong> <code>${esc(r.id)}</code> ${tag(r.in_simulator?'시뮬레이터 규칙 있음':'계약에 정의')}<div>${esc(r.ban_reason||r.note||'')} ${r.note&&r.ban_reason?esc(r.note):''}</div></li>`).join('')}</ul></section>`;
  return html;
 }
 function phraseCard(p){
  const statusTags=[tag(label('pool',p.pool),'blue'),p.stage?tag(label('stage',p.stage)):null,p.nature?tag(label('nature',p.nature)):null,p.runtime_selection_status==='REGISTERED_NOT_SELECTED'?tag('등록 · 선정 분기 없음','amber'):null,list(p.discrepancies).length?tag('원본 문구 차이','amber'):null].filter(Boolean).join('');
  return `<article class="phrase-card" id="${esc(p.id)}" aria-label="${esc(p.id)} ${esc(p.text)}"><div class="phrase-grid"><div class="cell goal-cell"><span class="mobile-label">적용 문구 · 이유</span><h3 class="phrase-title">${esc(p.text)}</h3><div class="id-line"><span class="id">${esc(p.id)}</span></div><p class="reason">${esc(p.reason)}</p><div class="tag-row">${statusTags}</div><button class="button subtle row-permalink" type="button" data-review-phrase="${esc(p.id)}" aria-label="${esc(p.id)} 문구 검토">문구 검토</button></div><div class="cell evidence-cell"><span class="mobile-label">근거 · 출처</span>${evidenceMarkup(p)}</div><div class="cell question-cell"><span class="mobile-label">질문 · 목표 연동</span>${connectionMarkup(p)}<div class="condition-line">${exposureSummary(p).map(value=>`<span>${esc(value)}</span>`).join('')}</div></div></div><div class="phrase-bottom"><details class="row-details" data-phrase="${esc(p.id)}"><summary>원문·선택지·적용 조건 상세</summary><div class="details-content"></div></details><button class="button subtle row-permalink" data-copy-phrase="${esc(p.id)}" type="button" aria-label="${esc(p.id)} 문구 링크 복사">링크 복사</button></div></article>`;
 }
 function emptyMarkup(message){return `<div class="empty-state"><h3>일치하는 항목이 없습니다</h3><p>${esc(message)}</p><button class="button" type="button" data-reset>검색·필터 초기화</button></div>`;}
 function renderPhrases(values,terms){
  state.filtered=state.data.phrases.filter(p=>matchesPhrase(p,values,terms));
  const total=state.filtered.length,pages=Math.max(1,Math.ceil(total/state.pageSize));state.page=Math.min(Math.max(1,state.page),pages);
  const start=(state.page-1)*state.pageSize,visible=state.filtered.slice(start,start+state.pageSize);
  $('result-summary').innerHTML=`전체 ${number(state.data.phrases.length)}개 중 <b>${number(total)}개</b>${total?` · ${number(start+1)}–${number(start+visible.length)}번째`:''}`;
  $('phrase-results').innerHTML=visible.length?visible.map(phraseCard).join(''):emptyMarkup('검색어를 줄이거나 선택한 조건을 해제해 주세요.');
  $('pagination').hidden=total<=state.pageSize;$('previous-page').disabled=state.page<=1;$('next-page').disabled=state.page>=pages;$('page-summary').textContent=`${state.page} / ${pages} 페이지`;
  $('export-csv').disabled=!total;
 }
 function questionCard(q){
  const direct=state.data.phrases.filter(p=>p.axis===q.id),branch=state.data.phrases.filter(p=>p.question_link_type==='RECOVERY_BRANCH'&&list(p.question_ids).includes(q.id));
  const evidenceIds=[...new Set(direct.flatMap(p=>p.source_ids))];
  const questionStatus=q.runtime_generation_status;
  const statusNote=q.runtime_note;
  let connections=direct.length?`<p class="q-note"><b>${number(direct.length)}개</b> 목표 문구가 이 질문의 식이 축에 연결됩니다.</p><div class="goal-samples">${direct.slice(0,4).map(p=>`<button type="button" data-show-phrase="${esc(p.id)}">${esc(p.text)}</button>`).join('')}</div><button class="button" type="button" data-show-axis="${esc(q.id)}">연결 목표 ${number(direct.length)}개 보기 →</button>`:'<p class="q-note">이 질문 ID를 식이 축으로 사용하는 목표 문구는 없습니다.</p>';
  if(branch.length)connections+=`<p class="q-note">고정 질문에서 적게 먹거나 거른 답은 <b>회복 목표 ${number(branch.length)}개</b>의 후보 분기로도 연결됩니다.</p><button class="button" type="button" data-show-pool="RECOVERY">회복 목표 보기 →</button>`;
  if(evidenceIds.length)connections+=`<p class="q-note"><b>연결 목표의 근거:</b> ${esc(evidenceIds.map(id=>sources.get(id)?.name||id).join(' · '))}</p><p class="detail-note">질문 자체의 직접 근거 ID가 아닌, 같은 축에 연결된 목표들의 출처입니다.</p>`;
  return `<article class="question-card" id="${esc(q.id)}"><div class="question-card-header"><div class="id-line"><code>${esc(q.id)}</code>${tag(q.axis,'blue')}${tag(label('role',q.role))}${questionStatus==='REGISTERED_NOT_GENERATED'?tag('등록 · 생성 경로 없음','amber'):''}</div><span class="id">v${esc(q.version)}</span></div><h3>${esc(q.text)}</h3>${statusNote?`<p class="q-note">${esc(statusNote)}</p>`:''}<div class="q-layout"><div><h4>등록 선택지 · 점수</h4>${optionMarkup(q)}${q.options_kind!=='FIXED'?`<p class="detail-note">시간에 따라 선택지 표시가 달라질 수 있습니다. 아래 원본 조건을 함께 확인하세요.</p>`:''}<details class="row-details"><summary>관찰 범위·선택지 조건</summary><div class="detail-box"><dl><dt>노출 조건</dt><dd>${esc(q.meal_scope||'미기재')}</dd><dt>관찰 범위</dt><dd>${esc(q.observation_scope||'미기재')}</dd><dt>해석 제한</dt><dd>${esc(q.interpretation_limit||'미기재')}</dd></dl>${list(q.options).some(o=>o.note)?`<ul>${q.options.filter(o=>o.note).map(o=>`<li><b>${esc(o.label)}</b> · ${esc(o.note)}</li>`).join('')}</ul>`:''}</div></details></div><div><h4>목표 문구 연결</h4>${connections}</div></div></article>`;
 }
 function renderQuestions(values,terms){
  const results=state.data.questions.filter(q=>{
   if(values.axis&&(values.axis==='NONE'?['FIXED','ROTATING'].includes(q.role):q.id!==values.axis))return false;
   const related=state.data.phrases.filter(p=>list(p.question_ids).includes(q.id));
   const text=normalized([q.id,q.axis,q.text,label('role',q.role),...q.options.map(o=>o.label),...related.map(p=>p._search)].join(' '));
   return terms.every(term=>text.includes(term));
  });
  $('result-summary').innerHTML=`등록 질문 ${number(state.data.questions.length)}개 중 <b>${number(results.length)}개</b> · 식이 축 ${number(state.data.meta.counts.axes)}개와 후속·확인 질문`;
  $('question-results').innerHTML=results.length?results.map(questionCard).join(''):emptyMarkup('질문 문구나 ID로 검색하거나 식이 축을 바꿔 주세요.');
 }
 function render(){if(!state.loaded)return;const values=Object.fromEntries(filterIds.map(id=>[id,$('filter-'+id).value]));const terms=normalized($('search').value).split(' ').filter(Boolean);state.mode==='phrases'?renderPhrases(values,terms):renderQuestions(values,terms);}
 function setMode(mode){
  state.mode=mode;state.page=1;
  for(const name of ['phrases','questions']){const active=name===mode;$(name+'-tab').setAttribute('aria-selected',String(active));$(name+'-tab').tabIndex=active?0:-1;$(name+'-panel').hidden=!active;}
  document.querySelectorAll('[data-phrase-filter]').forEach(el=>{el.hidden=mode==='questions';});
  $('page-size-label').hidden=mode==='questions';$('export-csv').hidden=mode==='questions';
  if(mode==='questions')for(const id of filterIds.filter(id=>id!=='axis'))$('filter-'+id).value='';
  render();
 }
 function resetFilters(renderNow=true){$('search').value='';filterIds.forEach(id=>{$('filter-'+id).value='';});state.page=1;if(renderNow)render();}
 function scrollToResults(){const target=$(state.mode==='phrases'?'phrases-panel':'questions-panel');target.scrollIntoView({behavior:'auto',block:'start'});}
 function showPhrase(id){if(!phrases.has(id))return;resetFilters(false);$('search').value=id;setMode('phrases');history.replaceState(null,'','#'+encodeURIComponent(id));const card=$(id),detail=card?.querySelector('details');if(detail)detail.open=true;card?.scrollIntoView({behavior:'auto',block:'start'});}
 function notify(message){clearTimeout(statusTimer);$('action-status').textContent=message;statusTimer=setTimeout(()=>{$('action-status').textContent='';},3500);}
 async function copyPhrase(id){const url=new URL('diet-applied-phrases.html',location.href);url.hash=id;try{if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(url.href);notify(`${id} 문구 링크를 복사했습니다.`);}catch{$('copy-link-value').value=url.href;$('copy-link-open').href=url.href;$('copy-link-dialog').showModal();$('copy-link-value').focus();$('copy-link-value').select();}}
 function exportCsv(){
  const columns=['문구 ID','현재 적용 문구','계약 문구 차이','상세 문구','이유','식이 축','질문 ID','질문 문구','질문 연동 유형','목표 유형','단계','선정 상태','근거 상태','근거 원문','출처 ID','출처명','원문 URL','원본 노출 태그','시간대','달력','문구 성격','식후 후보','축에 연결된 질환 규칙','축에 연결된 검진 지표','성격에 연결된 제한 규칙'];
  const rows=state.filtered.map(p=>[p.id,p.text,list(p.discrepancies).map(d=>d.contract_value).join(' | '),p.full_text,p.reason,questions.get(p.axis)?.axis||'축 직접 연결 없음',list(p.question_ids).join(' | '),associatedQuestions(p).map(q=>q.text).join(' | '),label('question_link_type',p.question_link_type),label('pool',p.pool),label('stage',p.stage),label('runtime_selection_status',p.runtime_selection_status),label('evidence_status',p.evidence_status),p.evidence_raw,list(p.source_ids).join(' | '),sourceNames(p).join(' | '),list(p.source_ids).map(id=>sources.get(id)?.url||'').join(' | '),p.exposure?.raw_tag,label('time',p.exposure?.time),label('calendar',p.exposure?.calendar),label('nature',p.nature),p.exposure?.after_dinner?'포함':'미포함',list(p.disease_rule_ids).map(id=>`${id} ${diseases.get(id)?.name||''}`).join(' | '),list(p.screening_metric_ids).map(id=>`${id} ${screening.get(id)?.name||''}`).join(' | '),list(p.restriction_rule_ids).map(id=>`${id} ${diseases.get(id)?.name||''}`).join(' | ')]);
  const cell=value=>{let text=String(value??'');if(/^[\s]*[=+\-@]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
  const csv='\uFEFF'+[columns,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='maireport-diet-applied-phrases.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`${number(rows.length)}개 문구의 조회 결과를 CSV로 저장했습니다.`);
 }
 async function loadData(){
  $('load-error').hidden=true;$('app-content').setAttribute('aria-busy','true');
  try{
   const response=await fetch('files/diet-applied-data.json',{cache:'no-cache'});if(!response.ok)throw new Error('reference data unavailable');const data=await response.json();
   if(!Array.isArray(data.phrases)||!data.phrases.length||!Array.isArray(data.questions)||!Array.isArray(data.sources)||!data.meta?.counts)throw new Error('reference data incomplete');
   state.data=data;labels=data.meta.labels||{};questions=new Map(data.questions.map(q=>[q.id,q]));sources=new Map(data.sources.map(s=>[s.id,s]));diseases=new Map(list(data.disease_rules).map(r=>[r.id,r]));screening=new Map(list(data.screening_links).map(r=>[r.id,r]));phrases=new Map(data.phrases.map(p=>[p.id,p]));
   for(const p of data.phrases)p._search=getPhraseSearch(p);
   populateSelect('filter-axis',[...data.questions.filter(q=>['FIXED','ROTATING'].includes(q.role)).map(q=>[q.id,q.axis]),['NONE','축 직접 연결 없음 / 보조 질문']]);
   populateSelect('filter-pool',Object.entries(labels.pool||{}));populateSelect('filter-stage',[...Object.entries(labels.stage||{}),['NONE','단계 지정 없음']]);populateSelect('filter-source',data.sources.map(s=>[s.id,`${s.name} (${s.phrase_count})`]));
   updateMeta();state.loaded=true;document.dispatchEvent(new CustomEvent('maireport:phrases-loaded',{detail:data}));$('app-content').setAttribute('aria-busy','false');document.querySelectorAll('#app-content input,#app-content select,#app-content button').forEach(el=>{el.disabled=false;});render();
   let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{}if(phrases.has(id))showPhrase(id);else if(questions.has(id)){resetFilters(false);$('search').value=id;setMode('questions');scrollToResults();}
  }catch(error){state.loaded=false;$('load-error').hidden=false;$('app-content').setAttribute('aria-busy','false');$('phrase-results').innerHTML='';$('result-summary').textContent='데이터 불러오기 대기';$('data-meta').textContent='기준 데이터를 불러오지 못했습니다.';}
 }
 $('retry-load').addEventListener('click',loadData);
 $('copy-link-close').addEventListener('click',()=>$('copy-link-dialog').close());
 $('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.page=1;render();},100);});
 filterIds.forEach(id=>$('filter-'+id).addEventListener('change',()=>{state.page=1;render();}));
 $('page-size').addEventListener('change',()=>{state.pageSize=Number($('page-size').value);state.page=1;render();});
 $('reset-filters').addEventListener('click',()=>resetFilters());
 $('needs-review').addEventListener('click',()=>{resetFilters(false);$('filter-evidence').value='REVIEW';setMode('phrases');scrollToResults();});
 $('phrases-tab').addEventListener('click',()=>setMode('phrases'));$('questions-tab').addEventListener('click',()=>setMode('questions'));
 document.querySelector('[role=tablist]').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const mode=e.key==='Home'?'phrases':e.key==='End'?'questions':state.mode==='phrases'?'questions':'phrases';setMode(mode);$(mode+'-tab').focus();});
 $('previous-page').addEventListener('click',()=>{state.page--;render();scrollToResults();});$('next-page').addEventListener('click',()=>{state.page++;render();scrollToResults();});
 $('export-csv').addEventListener('click',exportCsv);
 document.addEventListener('toggle',e=>{const detail=e.target;if(!(detail instanceof HTMLDetailsElement)||!detail.open||!detail.dataset.phrase||detail.dataset.loaded)return;const p=phrases.get(detail.dataset.phrase);if(p){detail.querySelector('.details-content').innerHTML=phraseDetails(p);detail.dataset.loaded='true';}},true);
 document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.hasAttribute('data-reset'))resetFilters();else if(button.dataset.copyPhrase)copyPhrase(button.dataset.copyPhrase);else if(button.dataset.showPhrase)showPhrase(button.dataset.showPhrase);else if(button.dataset.showAxis){resetFilters(false);$('filter-axis').value=button.dataset.showAxis;setMode('phrases');scrollToResults();}else if(button.dataset.showPool){resetFilters(false);$('filter-pool').value=button.dataset.showPool;setMode('phrases');scrollToResults();}});
 addEventListener('hashchange',()=>{let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{}if(state.loaded&&phrases.has(id))showPhrase(id);});
 loadData();
})();
