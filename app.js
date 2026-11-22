const monthLabel=document.querySelector('#monthLabel');
const calendarGrid=document.querySelector('#calendarGrid');
const monthTotal=document.querySelector('#monthTotal');
const monthCount=document.querySelector('#monthCount');
const detailDate=document.querySelector('#detailDate');
const dayTotal=document.querySelector('#dayTotal');
const recordList=document.querySelector('#recordList');
const emptyState=document.querySelector('#emptyState');
const toast=document.querySelector('#toast');
const readingAuthMessage=document.querySelector('#readingAuthMessage');
const googleSignIn=document.querySelector('#googleSignIn');
const googleSignOut=document.querySelector('#googleSignOut');
const signedInAs=document.querySelector('#signedInAs');
const addBookButton=document.querySelector('#addBookButton');
const readingForm=document.querySelector('#readingForm');
const readingList=document.querySelector('#readingList');
const readingEmpty=document.querySelector('#readingEmpty');
const readingDateLabel=document.querySelector('#readingDateLabel');
const planDateLabel=document.querySelector('#planDateLabel');
const planProgress=document.querySelector('#planProgress');
const planHint=document.querySelector('#planHint');
const planSignInButton=document.querySelector('#planSignInButton');
const planList=document.querySelector('#planList');
const addPlanTaskButton=document.querySelector('#addPlanTaskButton');
const editPlanTemplateButton=document.querySelector('#editPlanTemplateButton');
const planTaskForm=document.querySelector('#planTaskForm');
const templateForm=document.querySelector('#planTemplateForm');
const templateTaskList=document.querySelector('#templateTaskList');
let records=[];
let visibleMonth=new Date();
visibleMonth=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth(),1);
let selectedDate='';
let installPrompt=null;
let firebaseReady=false;
let auth=null;
let db=null;
let currentUser=null;
let readingRecords=[];
let readingUnsubscribe=null;
let editingBookId=null;
let authErrorMessage='';
let planTemplates=[];
let planDayData={completedTaskIds:[],customTasks:[]};
let planDayUnsubscribe=null;
let planTemplateUnsubscribe=null;
let editingCustomTaskId=null;
const DEFAULT_PLAN_TASKS=[
 {id:'littlefox',title:'Little Fox',minutes:null},
 {id:'english-book',title:'English book',minutes:10},
 {id:'ebs-video',title:'EBS viewing',minutes:null},
 {id:'reading-workbook',title:'Reading comprehension workbook',minutes:null}
];
const byDate=new Map();
const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
const weekNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function parseDate(value){const p=value.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);}
function keyForDate(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
function formatDuration(seconds){const m=Math.round((Number(seconds)||0)/60);const h=Math.floor(m/60);const r=m%60;if(h&&r)return h+' hr '+r+' min';if(h)return h+' hr';return m+' min';}
function compactDuration(seconds){const m=Math.round((Number(seconds)||0)/60);return m?m+' min':'<1 min';}
function formatDayHeading(key){const d=parseDate(key);return d.toLocaleString('en-US',{month:'short'})+'. '+d.getDate()+' '+weekNames[d.getDay()];}
function render(){
 const y=visibleMonth.getFullYear(),m=visibleMonth.getMonth();monthLabel.textContent=monthNames[m]+' '+y;calendarGrid.replaceChildren();
 const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
 const monthly=records.filter(r=>{const d=parseDate(r.date);return d.getFullYear()===y&&d.getMonth()===m;});
 monthTotal.textContent=formatDuration(monthly.reduce((s,r)=>s+(Number(r.seconds)||0),0));
 monthCount.textContent=monthly.length+' records across '+new Set(monthly.map(r=>r.date)).size+' study days';
 for(let i=0;i<first;i++){const blank=document.createElement('div');blank.className='day-cell empty';blank.setAttribute('aria-hidden','true');calendarGrid.append(blank);}
 for(let day=1;day<=days;day++){
  const date=new Date(y,m,day),key=keyForDate(date),items=byDate.get(key)||[],seconds=items.reduce((s,r)=>s+(Number(r.seconds)||0),0),button=document.createElement('button');
  const classes=['day-cell'];if(date.getDay()===0)classes.push('sunday');if(date.getDay()===6)classes.push('saturday');if(key===selectedDate)classes.push('selected');if(key===keyForDate(new Date()))classes.push('today');
  button.type='button';button.className=classes.join(' ');button.setAttribute('role','gridcell');button.setAttribute('aria-label',formatDayHeading(key)+(items.length?', '+compactDuration(seconds)+' study time':', no study records'));
  const number=document.createElement('span');number.className='day-number';number.textContent=String(day);button.append(number);
  if(items.length){const meta=document.createElement('span');meta.className='day-meta';const dot=document.createElement('i');dot.className='study-dot';dot.setAttribute('aria-hidden','true');const time=document.createElement('span');time.className='day-time';time.textContent=compactDuration(seconds);meta.append(dot,time);button.append(meta);}
  button.addEventListener('click',()=>selectDay(key));calendarGrid.append(button);
 }
 if(selectedDate)renderDetails(selectedDate);
}
function renderDetails(key){
 const items=(byDate.get(key)||[]).slice().sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 detailDate.textContent=formatDayHeading(key);dayTotal.textContent=formatDuration(items.reduce((s,r)=>s+(Number(r.seconds)||0),0));recordList.replaceChildren();emptyState.hidden=items.length>0;
 for(const record of items){
  const row=document.createElement('article');row.className='record-row';
  const time=document.createElement('span');time.className='record-time';time.textContent=record.time||'';
  const title=document.createElement('span');title.className='record-title';title.textContent=record.title||'Untitled study';
  const score=document.createElement('span');score.className='record-score';score.textContent=record.score&&record.score!=='0'?record.score+' pts':'—';
  row.append(time,title,score);recordList.append(row);
 }
 renderReadingRecords();
  renderStudyPlan();
}
function selectDay(key){selectedDate=key;render();subscribePlanDay();}
function chooseLatestStudyDay(){const y=visibleMonth.getFullYear(),m=visibleMonth.getMonth();const days=Array.from(new Set(records.map(r=>r.date))).filter(k=>{const d=parseDate(k);return d.getFullYear()===y&&d.getMonth()===m;}).sort();selectedDate=days.length?days[days.length-1]:keyForDate(new Date(y,m,1));}
function moveMonth(n){visibleMonth=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()+n,1);chooseLatestStudyDay();render();subscribePlanDay();}
document.querySelector('#previousMonth').addEventListener('click',()=>moveMonth(-1));
document.querySelector('#nextMonth').addEventListener('click',()=>moveMonth(1));
async function loadRecords(){
 try{const response=await fetch('./data/records.json?v='+Date.now(),{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);records=await response.json();byDate.clear();for(const r of records){if(!byDate.has(r.date))byDate.set(r.date,[]);byDate.get(r.date).push(r);}chooseLatestStudyDay();render();subscribePlanDay();}
 catch(error){monthTotal.textContent='Unavailable';monthCount.textContent='Connect to the internet and try again.';detailDate.textContent='Records unavailable';emptyState.hidden=false;emptyState.textContent='Connect to the internet, then reload this page.';showToast('Could not load study records.');console.error(error);}
}
function showToast(message){toast.textContent=message;toast.classList.add('show');window.setTimeout(()=>toast.classList.remove('show'),3200);}
function showAuthError(error){
 const code=error&&error.code?error.code:'auth/unknown';
 const messages={
  'auth/unauthorized-domain':'This app address is not authorized in Firebase. Add ellie150121.github.io under Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed':'Google sign-in is not enabled for this Firebase project.',
  'auth/popup-blocked':'The browser blocked the Google sign-in window. Open the app in Chrome and allow pop-ups for this site.',
  'auth/popup-closed-by-user':'The Google sign-in window closed before sign-in finished.',
  'auth/network-request-failed':'Google sign-in could not connect. Check the internet connection and try again.',
  'auth/cancelled-popup-request':'Another Google sign-in window is already open.'
 };
 authErrorMessage=(messages[code]||'Google sign-in did not finish. Error code: '+code)+' ( '+code+' )';
 readingAuthMessage.textContent=authErrorMessage;
 readingAuthMessage.style.color='#b94f3d';
 if(planHint){planHint.textContent=authErrorMessage;planHint.style.color='#b94f3d';}
 console.error('Google sign-in failed:',code,error&&error.message||'');
}
function planCollection(name){return db.collection('users').doc(currentUser.uid).collection(name);}
function planEffectiveFor(date){
 return planTemplates.filter(item=>item.effectiveFrom<=date).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]||null;
}
function renderStudyPlan(){
 if(!planList)return;
 planDateLabel.textContent=selectedDate?formatDayHeading(selectedDate):'Select a date';
 const signedIn=Boolean(currentUser);
 planSignInButton.hidden=signedIn||!firebaseReady;
 addPlanTaskButton.disabled=!signedIn;
 editPlanTemplateButton.disabled=!signedIn;
 const template= signedIn ? planEffectiveFor(selectedDate) : null;
 const defaults=(template&&Array.isArray(template.tasks)?template.tasks:DEFAULT_PLAN_TASKS);
 const custom=signedIn&&Array.isArray(planDayData.customTasks)?planDayData.customTasks:[];
 const tasks=[...defaults.map(task=>({...task,custom:false})),...custom.map(task=>({...task,custom:true}))];
 const completed=new Set(signedIn&&Array.isArray(planDayData.completedTaskIds)?planDayData.completedTaskIds:[]);
 const completedCount=tasks.filter(task=>completed.has(task.id)).length;
 planProgress.textContent=completedCount+' / '+tasks.length+' done';
 if(!signedIn){
  if(firebaseReady){planHint.textContent='Sign in to save daily checkmarks and sync this plan across devices.';planHint.style.color='';}
  else{planHint.textContent='Firebase setup is needed to save and sync plans.';}
 }else{
  planHint.textContent=planTemplates.length?'Check tasks as Eunseo finishes them.':'Loading daily plan…';
  planHint.style.color='';
 }
 planList.replaceChildren();
 for(const task of tasks){
  const row=document.createElement('div');row.className='plan-row';
  const check=document.createElement('input');check.type='checkbox';check.className='plan-check';check.checked=completed.has(task.id);check.disabled=!signedIn;check.setAttribute('aria-label','Mark '+task.title+' complete');
  check.addEventListener('change',()=>togglePlanTask(task.id,check.checked));
  const title=document.createElement('span');title.className='plan-task-title'+(check.checked?' completed':'');title.textContent=task.title;
  row.append(check,title);
  if(task.minutes){const target=document.createElement('span');target.className='plan-task-target';target.textContent=task.minutes+' min';row.append(target);}
  else if(task.custom){row.append(document.createElement('span'));}
  if(task.custom&&signedIn){
   const actions=document.createElement('div');actions.className='plan-row-actions';
   const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.addEventListener('click',()=>openPlanTaskForm(task));
   const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';remove.addEventListener('click',()=>deleteCustomPlanTask(task.id));
   actions.append(edit,remove);row.append(actions);
  }
  planList.append(row);
 }
}
function subscribePlanTemplates(){
 if(planTemplateUnsubscribe){planTemplateUnsubscribe();planTemplateUnsubscribe=null;}
 if(!currentUser){planTemplates=[];renderStudyPlan();return;}
 const ref=planCollection('studyPlanTemplates');
 planTemplateUnsubscribe=ref.onSnapshot(snapshot=>{
  if(snapshot.empty){
   ref.doc('initial').set({effectiveFrom:'0000-01-01',tasks:DEFAULT_PLAN_TASKS,updatedAt:new Date().toISOString()}).catch(error=>{console.error(error);planHint.textContent='Could not save the default plan. Check Firestore rules.';});
   return;
  }
  planTemplates=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
  renderStudyPlan();
 },error=>{console.error(error);planHint.textContent='Could not load the plan. Check Firestore rules.';});
}
function subscribePlanDay(){
 if(planDayUnsubscribe){planDayUnsubscribe();planDayUnsubscribe=null;}
 planDayData={completedTaskIds:[],customTasks:[]};
 if(!currentUser||!selectedDate){renderStudyPlan();return;}
 const date=selectedDate;
 planDayUnsubscribe=planCollection('studyPlanDays').doc(date).onSnapshot(snapshot=>{
  if(date!==selectedDate)return;
  planDayData=snapshot.exists?snapshot.data():{completedTaskIds:[],customTasks:[]};
  renderStudyPlan();
 },error=>{console.error(error);planHint.textContent='Could not load this day’s plan. Check Firestore rules.';});
 renderStudyPlan();
}
async function savePlanDay(changes){
 if(!currentUser||!selectedDate)return false;
 const data={date:selectedDate,completedTaskIds:planDayData.completedTaskIds||[],customTasks:planDayData.customTasks||[],...changes,updatedAt:new Date().toISOString()};
 try{await planCollection('studyPlanDays').doc(selectedDate).set(data,{merge:true});planDayData=data;renderStudyPlan();return true;}
 catch(error){console.error(error);showToast('Could not save today’s plan. Check Firestore rules.');return false;}
}
async function togglePlanTask(id,checked){
 const values=new Set(planDayData.completedTaskIds||[]);checked?values.add(id):values.delete(id);
 await savePlanDay({completedTaskIds:Array.from(values)});
}
function openPlanTaskForm(task=null){
 editingCustomTaskId=task?task.id:null;
 document.querySelector('#planTaskTitle').value=task?task.title:'';
 document.querySelector('#planTaskMinutes').value=task&&task.minutes?task.minutes:'';
 planTaskForm.querySelector('.plan-save').textContent=task?'Update task':'Save task';
 planTaskForm.hidden=false;templateForm.hidden=true;
 document.querySelector('#planTaskTitle').focus();
}
function closePlanTaskForm(){editingCustomTaskId=null;planTaskForm.reset();planTaskForm.hidden=true;planTaskForm.querySelector('.plan-save').textContent='Save task';}
function tomorrowKey(){const date=new Date();date.setDate(date.getDate()+1);return keyForDate(date);}
function openTemplateEditor(){
 const template=planEffectiveFor(tomorrowKey());
 const tasks=(template&&Array.isArray(template.tasks)?template.tasks:DEFAULT_PLAN_TASKS).map(task=>({...task}));
 templateTaskList.replaceChildren();tasks.forEach(task=>addTemplateTaskRow(task));
 templateForm.hidden=false;planTaskForm.hidden=true;
 templateForm.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function addTemplateTaskRow(task={id:'task_'+Date.now(),title:'',minutes:null}){
 const row=document.createElement('div');row.className='template-task-row';row.dataset.taskId=task.id||'task_'+Date.now();
 const title=document.createElement('input');title.type='text';title.maxLength=100;title.required=true;title.placeholder='Daily task';title.value=task.title||'';title.setAttribute('aria-label','Daily task name');
 const minutes=document.createElement('input');minutes.className='template-minutes';minutes.type='number';minutes.min='1';minutes.max='600';minutes.placeholder='Minutes';minutes.value=task.minutes||'';minutes.setAttribute('aria-label','Target minutes, optional');
 const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Delete daily task');remove.addEventListener('click',()=>row.remove());
 row.append(title,minutes,remove);templateTaskList.append(row);
}
async function deleteCustomPlanTask(id){
 const tasks=(planDayData.customTasks||[]).filter(task=>task.id!==id);
 const completed=(planDayData.completedTaskIds||[]).filter(taskId=>taskId!==id);
 await savePlanDay({customTasks:tasks,completedTaskIds:completed});
}
addPlanTaskButton.addEventListener('click',()=>openPlanTaskForm());
editPlanTemplateButton.addEventListener('click',openTemplateEditor);
planSignInButton.addEventListener('click',()=>googleSignIn.click());
document.querySelector('#cancelPlanTask').addEventListener('click',closePlanTaskForm);
document.querySelector('#cancelTemplate').addEventListener('click',()=>{templateForm.reset();templateForm.hidden=true;});
document.querySelector('#addTemplateTaskButton').addEventListener('click',()=>addTemplateTaskRow());
planTaskForm.addEventListener('submit',async event=>{
 event.preventDefault();
 const title=document.querySelector('#planTaskTitle').value.trim();
 const rawMinutes=document.querySelector('#planTaskMinutes').value.trim();
 if(!title)return;
 const minutes=rawMinutes?Number(rawMinutes):null;
 let custom=[...(planDayData.customTasks||[])];
 const task={id:editingCustomTaskId||('custom_'+Date.now()),title,minutes};
 if(editingCustomTaskId)custom=custom.map(item=>item.id===editingCustomTaskId?task:item);else custom.push(task);
 if(await savePlanDay({customTasks:custom}))closePlanTaskForm();
});
templateForm.addEventListener('submit',async event=>{
 event.preventDefault();
 const tasks=Array.from(templateTaskList.querySelectorAll('.template-task-row')).map(row=>{
  const title=row.querySelector('input[type="text"]').value.trim();
  const rawMinutes=row.querySelector('.template-minutes').value.trim();
  return{id:row.dataset.taskId,title,minutes:rawMinutes?Number(rawMinutes):null};
 }).filter(task=>task.title);
 if(!tasks.length){showToast('Keep at least one daily task.');return;}
 if(tasks.length>30){showToast('A daily plan can have up to 30 tasks.');return;}
 const effectiveFrom=tomorrowKey();
 try{
  await planCollection('studyPlanTemplates').doc('from_'+effectiveFrom).set({effectiveFrom,tasks,updatedAt:new Date().toISOString()});
  templateForm.hidden=true;showToast('Daily schedule saved for tomorrow onward.');
 }catch(error){console.error(error);showToast('Could not save the daily schedule. Check Firestore rules.');}
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;const button=document.querySelector('#installButton');button.hidden=false;button.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;button.hidden=true;},{once:true});});
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));}
const OWNER='Ellie150121',REPO='study-calendar',WORKFLOW='update-and-deploy.yml',KEY='lf_update_key';
const updateButton=document.createElement('button');updateButton.id='updateButton';updateButton.className='install-button update-icon';updateButton.type='button';updateButton.textContent='↻';updateButton.setAttribute('aria-label','Update study records');updateButton.title='Update study records';document.querySelector('.topbar').append(updateButton);
updateButton.addEventListener('click',async()=>{
 if(!confirm('If your child is studying now, this may sign them out. Start the update?'))return;
 let token=localStorage.getItem(KEY);if(!token){token=(prompt('Paste the GitHub update key')||'').trim();if(!token)return;localStorage.setItem(KEY,token);}
 updateButton.disabled=true;
 try{const response=await fetch('https://api.github.com/repos/'+OWNER+'/'+REPO+'/actions/workflows/'+WORKFLOW+'/dispatches',{method:'POST',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({ref:'main'})});
  if(response.status===204){showToast('Update started. Check again in 3–5 minutes.');window.setTimeout(loadRecords,180000);window.setTimeout(loadRecords,300000);}
  else{if(response.status===401)localStorage.removeItem(KEY);showToast('Could not start update (error '+response.status+').');}
 }catch(error){showToast('Check your internet connection and try again.');}
 window.setTimeout(()=>{updateButton.disabled=false;},60000);
});

function setupFirebase(){
 const config=window.FIREBASE_CONFIG;
 if(!config||!config.apiKey||config.apiKey==='PASTE_FIREBASE_API_KEY_HERE'||!config.projectId){
  readingAuthMessage.textContent='Connect Firebase once to sync book notes between your devices. Setup steps are in FIREBASE_SETUP_KO.md.';
  readingEmpty.textContent='Firebase setup is needed before book notes can be saved.';
  return;
 }
 if(!window.firebase){readingAuthMessage.textContent='Could not load secure sync. Check your internet connection and reload.';return;}
 try{if(!firebase.apps.length)firebase.initializeApp(config);auth=firebase.auth();db=firebase.firestore();firebaseReady=true;googleSignIn.hidden=false;addBookButton.disabled=false;
  renderStudyPlan();
  auth.getRedirectResult().then(result=>{
   if(result&&result.user){authErrorMessage='';showToast('Signed in as '+(result.user.email||'Google account'));}
  }).catch(showAuthError);
  auth.onAuthStateChanged(user=>{
   currentUser=user;googleSignIn.hidden=!!user;googleSignOut.hidden=!user;signedInAs.hidden=!user;addBookButton.disabled=!user;
   signedInAs.textContent=user?'Synced as '+(user.email||'Google account'):'';
   if(user){authErrorMessage='';readingAuthMessage.style.color='';readingAuthMessage.textContent='Your book notes sync securely on this account.';}
   else{readingAuthMessage.textContent=authErrorMessage||'Sign in with the same Google account on each device to sync.';}
   if(readingUnsubscribe){readingUnsubscribe();readingUnsubscribe=null;}
   readingRecords=[];
   if(user){readingUnsubscribe=db.collection('users').doc(user.uid).collection('readingBooks').onSnapshot(snapshot=>{readingRecords=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));renderReadingRecords();},error=>{console.error(error);showToast('Could not load book notes. Check Firestore rules.');});}
    renderReadingRecords();
    subscribePlanTemplates();
    subscribePlanDay();
  });
 }catch(error){console.error(error);readingAuthMessage.textContent='Firebase setup is incomplete. Check the setup guide.';}
}
function renderReadingRecords(){
 if(!readingList)return;readingList.replaceChildren();
 const items=readingRecords.filter(item=>item.date===selectedDate).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
 readingEmpty.hidden=items.length>0;readingDateLabel.textContent=selectedDate?formatDayHeading(selectedDate):'—';
 for(const item of items){
  const card=document.createElement('article');card.className='reading-entry';
  const title=document.createElement('h3');title.textContent=item.title||'Untitled book';card.append(title);
  if(item.amount!==null&&item.amount!==undefined&&item.amount!==''){const amount=document.createElement('p');amount.className='reading-entry-amount';amount.textContent=String(item.amount)+' '+(item.unit==='minutes'?'min':'pages');card.append(amount);}
  if(item.note){const note=document.createElement('p');note.className='reading-entry-note';note.textContent=item.note;card.append(note);}
  const actions=document.createElement('div');actions.className='reading-entry-actions';
  const edit=document.createElement('button');edit.type='button';edit.className='text-button';edit.textContent='Edit';edit.addEventListener('click',()=>editReading(item));
  const remove=document.createElement('button');remove.type='button';remove.className='text-button delete-reading';remove.textContent='Delete';remove.addEventListener('click',()=>deleteReading(item));
  actions.append(edit,remove);card.append(actions);readingList.append(card);
 }
}
function resetReadingForm(){editingBookId=null;readingForm.reset();readingForm.hidden=true;document.querySelector('#bookUnit').value='pages';document.querySelector('.save-reading').textContent='Save entry';}
addBookButton.addEventListener('click',()=>{if(!currentUser){showToast('Sign in with Google first.');return;}resetReadingForm();readingDateLabel.textContent=formatDayHeading(selectedDate);readingForm.hidden=false;document.querySelector('#bookTitle').focus();});
document.querySelector('#cancelReading').addEventListener('click',resetReadingForm);
googleSignIn.addEventListener('click',async()=>{
 if(!firebaseReady){showAuthError({code:'auth/not-initialized'});return;}
 googleSignIn.disabled=true;
 const oldText=googleSignIn.textContent;
 googleSignIn.textContent='Opening Google…';
 authErrorMessage='';readingAuthMessage.style.color='';readingAuthMessage.textContent='Waiting for Google sign-in…';
 try{
  const provider=new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  const result=await auth.signInWithPopup(provider);
  if(!result||!result.user)throw new Error('Google did not return a signed-in user.');
  authErrorMessage='';
  readingAuthMessage.style.color='';
  readingAuthMessage.textContent='Signed in. Connecting your book notes…';
 }catch(error){showAuthError(error);}
 finally{googleSignIn.disabled=false;googleSignIn.textContent=oldText;}
});
googleSignOut.addEventListener('click',async()=>{if(auth)await auth.signOut();resetReadingForm();});
readingForm.addEventListener('submit',async event=>{
 event.preventDefault();if(!currentUser||!db||!selectedDate)return;
 const amountValue=document.querySelector('#bookAmount').value.trim();
 const data={date:selectedDate,title:document.querySelector('#bookTitle').value.trim(),amount:amountValue===''?null:Number(amountValue),unit:document.querySelector('#bookUnit').value,note:document.querySelector('#bookNote').value.trim(),updatedAt:new Date().toISOString()};
 if(!data.title)return;
 const save=readingForm.querySelector('.save-reading');save.disabled=true;
 const wasEditing=Boolean(editingBookId);
 try{const collection=db.collection('users').doc(currentUser.uid).collection('readingBooks');if(editingBookId)await collection.doc(editingBookId).update(data);else await collection.add({...data,createdAt:new Date().toISOString()});resetReadingForm();showToast(wasEditing?'Book note updated.':'Book note saved.');}
 catch(error){console.error(error);showToast('Could not save. Check your connection and Firebase rules.');}
 finally{save.disabled=false;}
});
function editReading(item){editingBookId=item.id;document.querySelector('#bookTitle').value=item.title||'';document.querySelector('#bookAmount').value=item.amount??'';document.querySelector('#bookUnit').value=item.unit||'pages';document.querySelector('#bookNote').value=item.note||'';document.querySelector('.save-reading').textContent='Update entry';readingDateLabel.textContent=formatDayHeading(item.date);readingForm.hidden=false;readingForm.scrollIntoView({behavior:'smooth',block:'center'});}
async function deleteReading(item){if(!currentUser||!confirm('Delete this book note?'))return;try{await db.collection('users').doc(currentUser.uid).collection('readingBooks').doc(item.id).delete();showToast('Book note deleted.');}catch(error){console.error(error);showToast('Could not delete the book note.');}}
loadRecords();
setupFirebase();
