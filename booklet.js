/* Travel booklet: builds a magazine-style A4 booklet from the current plan.
   Relies on globals from index.html (days, segs, itemsOf, timeline, hotelInfo, ...). */
const CITY={'パリ':{en:'PARIS',c:'#1f3a5f',lat:48.8566,lon:2.3522},'モン・サン・ミッシェル':{en:'MONT-SAINT-MICHEL',c:'#2e6f73',lat:48.6361,lon:-1.5115},'ヴェネツィア':{en:'VENEZIA',c:'#a8483a',lat:45.4371,lon:12.3326},'ローマ':{en:'ROMA',c:'#a9782a',lat:41.8986,lon:12.4823}};
const CITY_INTRO={
'パリ':'セーヌ川の両岸に美術館、教会、大通りが広がる「花の都」。中心部はメトロとRERが網の目のように走り、1日券を使えばほとんどの名所に30分以内で行けます。人気の美術館や展望台は日時指定の予約制が主流なので、行く日が決まったら早めに予約を。メトロや観光地ではスリが非常に多いので、バッグは前に抱えて、スマホをテーブルに置かないように。',
'モン・サン・ミッシェル':'ノルマンディーとブルターニュの境、干潟に浮かぶ岩山の修道院。対岸のホテル街（ラ・カゼルヌ）から無料シャトルで約12分です。日帰り客が帰った夕方以降と早朝は人が少なく、ライトアップや朝焼けの撮影に最高の時間帯。潮の干満差が大きく、大潮の日は島へのアクセスが制限されることがあります。',
'ヴェネツィア':'車が一台も走らない「水の都」。移動は徒歩と水上バス（ヴァポレット）だけで、細い路地と橋が迷路のように続きます。地図アプリを頼りに、迷うこと自体を楽しむのがコツ。サン・マルコ広場周辺は昼は大混雑するので、朝早くと夕方以降がおすすめです。橋が多いのでスーツケースの移動は大変。',
'ローマ':'2000年以上の歴史が街じゅうに重なる「永遠の都」。古代遺跡、ルネサンスの教会、バロックの噴水が歩ける範囲に集まっています。地下鉄は2路線＋1路線と少なめで、中心部は歩くかバスが基本。教会は肩・膝を出す服装では入れないので、薄手の羽織りを持ち歩きましょう。'};
// local name, description, reservation, photo tip
const SPOT_INFO={
'エッフェル塔':['Tour Eiffel','1889年のパリ万博のために建てられた高さ330mの鉄塔。頂上の展望台からパリを一望でき、夜は毎正時から5分間、無数のライトがきらめきます。','推奨','日没後のブルーアワーと、毎正時のきらめきを狙う'],
'凱旋門':['Arc de Triomphe','ナポレオンが戦勝を記念して建てた門。284段の階段で上がる屋上から、シャンゼリゼと放射状に延びる12本の通りを見渡せます（エレベーターは停止中のことあり）。','','屋上から夕方〜夜のシャンゼリゼの光の帯'],
'ルーヴル美術館':['Musée du Louvre','「モナ・リザ」「ミロのヴィーナス」「サモトラケのニケ」を収める世界最大級の美術館。とにかく広いので、見たい作品を3〜4点に絞って回るのがコツ。','必須級','ガラスのピラミッドは朝一番か夜のライトアップ'],
'オルセー美術館':["Musée d'Orsay",'旧駅舎を改装した印象派の殿堂。モネ、ルノワール、ドガ、ゴッホの名作が並びます。5階の大時計の裏から見るパリの景色も名物。','推奨','大時計の文字盤越しにシルエットを撮る'],
'ノートルダム大聖堂':['Cathédrale Notre-Dame de Paris','2019年の火災から修復を終え、2024年12月に再開したゴシック建築の傑作。入場は無料ですが、時間帯によって行列ができます。','','セーヌ対岸（トゥルネル橋付近）から全景を'],
'サクレ・クール寺院':['Basilique du Sacré-Cœur','モンマルトルの丘の頂上に建つ白亜の聖堂。正面の階段からパリの街並みと夕日を一望できます。','','夕暮れの階段から市街地を見下ろす'],
'モンマルトル':['Montmartre','画家たちが集った坂の多い丘の街。テルトル広場の似顔絵描き、小さなブドウ畑、石畳の路地が魅力。階段付近の「ミサンガ売り」には近づかないで。','','石畳の坂道と街灯、夕方の柔らかい光'],
'シャンゼリゼ通り':['Avenue des Champs-Élysées','凱旋門からコンコルド広場まで続く約2kmの大通り。カフェや旗艦店が並ぶパリの顔です。','',''],
'セーヌ川':['Bords de la Seine','世界遺産に登録されたセーヌ河岸。豪華なアレクサンドル3世橋の周辺は、夜景とエッフェル塔を一緒に楽しめます。','','アレクサンドル3世橋の街灯越しにエッフェル塔'],
'サント・シャペル':['Sainte-Chapelle','13世紀の王室礼拝堂。四方を埋め尽くす15枚のステンドグラスは、晴れた日の午前〜昼に最も輝きます。','推奨','晴れた日の昼前、上階の礼拝堂で'],
'ヴェルサイユ宮殿':['Château de Versailles','ルイ14世が築いた絶対王政の象徴。黄金の「鏡の回廊」と広大な庭園は半日がかり。パリからRER C線で約1時間、月曜休館。','推奨','鏡の回廊は開館直後が比較的すいている'],
'トロカデロ広場':['Trocadéro','セーヌ対岸からエッフェル塔を真正面に望む定番の撮影スポット。早朝は人が少なく、夜はライトアップされた塔を独り占めできることも。','','早朝の無人の広場、または夜のライトアップ'],
'セーヌ川クルーズ':['Croisière sur la Seine','約1時間で主要な名所を川から巡る遊覧船。夜の便は、橋や建物のライトアップが見どころです。','','夜便の後方デッキからノートルダムやエッフェル塔を'],
'オランジュリー美術館':["Musée de l'Orangerie",'モネの大作「睡蓮」が楕円形の展示室をぐるりと囲む小さな美術館。チュイルリー公園の端にあり、ルーヴルと組み合わせやすい。','推奨',''],
'コンコルド広場':['Place de la Concorde','マリー・アントワネットが処刑された歴史の舞台。中央にはエジプトから贈られたオベリスクが立ちます。','',''],
'オペラ・ガルニエ':['Opéra Garnier','金色に輝く大階段と、シャガールの天井画で知られる19世紀の劇場。公演がない時間は内部を見学できます。','','大階段を上の階から見下ろす構図'],
'ギャラリー・ラファイエット屋上':['Galeries Lafayette','ステンドグラスのドームが華やかな老舗百貨店。屋上テラスは無料で、オペラ座とエッフェル塔を同時に望めます。','',''],
'アンヴァリッド':['Les Invalides','金色のドームの下にナポレオンが眠る、軍事博物館を併設した歴史的建造物。','',''],
'マレ地区':['Le Marais','17世紀の邸宅とおしゃれな店が混在する歴史地区。レンガ造りのヴォージュ広場は散歩に最適です。','',''],
'リュクサンブール公園':['Jardin du Luxembourg','宮殿と花壇が美しい、パリの人たちの憩いの公園。緑の椅子に座ってひと休みを。','',''],
'モンパルナス・タワー展望台':['Tour Montparnasse','56階の展望台から、エッフェル塔を含むパリの全景を見渡せます。夜景のエッフェル塔を撮るならここ。','','夜の展望台からエッフェル塔を含む夜景'],
'修道院':['Abbaye du Mont-Saint-Michel','岩山の頂上にそびえる修道院。約350段の階段を上り、天空の回廊や「ラ・メルヴェイユ」と呼ばれる建物群を巡ります。','推奨','西のテラスから湾を見下ろす'],
'グランド・リュ':['Grande Rue','島の入口から修道院へ続く石畳の参道。名物のふわふわオムレツやバタークッキーの店が並びます。','',''],
'城壁・展望テラス':['Remparts','城壁の上を歩くと、湾の干潟と潮の満ち引きを間近に眺められます。','','干潟に映る空と城壁のライン'],
'対岸の展望エリア':['La passerelle','島へ続く橋の手前から、島全体の姿を正面に。朝焼けや夕焼けに島がシルエットで浮かぶ定番の構図です。','','日の出・日の入りの前後30分、潮が満ちていれば水鏡も'],
'クエノン川の堰':['Barrage du Couesnon','川の堰の上の展望デッキ。ライトアップされた島を眺める夜景スポットで、ホテル街から歩いてすぐ。','','三脚があると◎。ライトアップ直後のブルーアワー'],
'コロッセオ':['Colosseo','約2000年前に造られた円形闘技場。最大5万人を収容した古代ローマの象徴です。共通券でフォロ・ロマーノも見学できます。','必須','外観は夕方〜夜のライトアップも美しい'],
'フォロ・ロマーノ':['Foro Romano','古代ローマの政治と宗教の中心だった遺跡群。パラティーノの丘から見下ろす眺めは圧巻。','必須','パラティーノの丘から遺跡全体を'],
'パンテオン':['Pantheon','2世紀に再建された神殿。天井の円窓（オクルス）から差し込む光の筋が神秘的です。','推奨','晴れた日の正午前後、円窓からの光の筋'],
'トレビの泉':['Fontana di Trevi','後ろ向きにコインを投げ入れると再びローマに戻ってこられるという言い伝えの泉。昼は大混雑します。','','人の少ない早朝か、ライトアップされた夜'],
'スペイン広場':['Piazza di Spagna','映画「ローマの休日」で有名な135段の階段。階段に座ることは禁止されています（罰金あり）。','',''],
'ナヴォーナ広場':['Piazza Navona','ベルニーニの「四大河の噴水」が立つ、楕円形の美しい広場。カフェで休憩するのにも◎。','',''],
'サンタンジェロ城':["Castel Sant'Angelo",'ハドリアヌス帝の霊廟から要塞へと姿を変えた城。屋上テラスからサン・ピエトロ大聖堂と夕日を望めます。','','サンタンジェロ橋の天使像越しに城と夕景'],
'バチカン美術館':['Musei Vaticani','歴代教皇のコレクションを収めた巨大な美術館。最後にミケランジェロの「最後の審判」があるシスティーナ礼拝堂へ（礼拝堂内は撮影禁止、修復作業中の場合あり）。日曜休館。','必須級','らせん階段（ブラマンテ階段）を真上から'],
'サン・ピエトロ大聖堂':['Basilica di San Pietro','カトリックの総本山。ミケランジェロの「ピエタ」や巨大な天蓋は必見です。肩や膝を出した服装では入れません。','','クーポラに登れば広場と街を一望'],
'ボルゲーゼ美術館':['Galleria Borghese','ベルニーニの彫刻とカラヴァッジョの絵画の宝庫。完全予約制で、2時間ごとの入れ替え制です。月曜休館。','必須',''],
'トラステヴェレ':['Trastevere','テヴェレ川の西側、石畳とツタの絡まる下町。夕食を食べに行くのにおすすめのエリアです。','','夕暮れ時、ツタの壁と街灯の灯る路地'],
'ヴィットリアーノ':['Vittoriano','白い大理石の巨大な記念堂。無料のテラスからでも、フォロ・ロマーノと市街を見渡せます。','',''],
'カピトリーニ美術館':['Musei Capitolini','ミケランジェロ設計のカンピドーリオ広場に面した、世界最古級の美術館。「カピトリーノの雌狼」で有名。','','美術館のテラスからフォロ・ロマーノを見下ろす'],
'真実の口':['Bocca della Verità','嘘つきが手を入れると噛まれるという伝説の石の円盤。「ローマの休日」の名場面の舞台です。','',''],
'ピンチョの丘':['Terrazza del Pincio','ポポロ広場を見下ろす高台のテラス。サン・ピエトロのドームの向こうに沈む夕日が有名です。','','日没の30分前から。ドームと夕焼けのシルエット'],
'ポポロ広場':['Piazza del Popolo','双子教会とオベリスクが立つ、ローマ北の玄関口の広場。ピンチョの丘とセットで。','',''],
'サンタ・マリア・マッジョーレ大聖堂':['Basilica di Santa Maria Maggiore','ローマ四大聖堂のひとつ。5世紀のモザイクと、黄金で飾られた格天井が見事です。','',''],
'カンポ・デ・フィオーリ':["Campo de' Fiori",'午前中は青空市場が開く広場。夜はバールやレストランでにぎわいます。','',''],
'サン・マルコ広場':['Piazza San Marco','ナポレオンが「ヨーロッパで最も美しい広間」と称えたと伝わる広場。早朝の静けさは格別です。','','早朝の人のいない広場、冬は高潮で水鏡になる日も'],
'サン・マルコ寺院':['Basilica di San Marco','金色のモザイクで覆われたビザンチン様式の大聖堂。大きな荷物は持ち込めないので、近くの無料預かり所へ。','推奨',''],
'ドゥカーレ宮殿':['Palazzo Ducale','ヴェネツィア共和国の総督の宮殿。豪華な大評議会の間を見て、ため息橋を渡り牢獄へと進みます。','推奨',''],
'リアルト橋':['Ponte di Rialto','カナル・グランデに架かる最古の石橋。周辺は市場とお土産店でにぎわいます。','','橋の上から運河を。夕方の光がきれい'],
'ため息橋':['Ponte dei Sospiri','宮殿と牢獄を結ぶ白い橋。囚人が最後に外の景色を見てため息をついたと言われます。','','隣のパーリア橋から'],
'カナル・グランデ':['Canal Grande','街を逆S字に貫く大運河。水上バス1番線にゆっくり乗るだけで、両岸の宮殿を巡るクルーズになります。','','水上バスの最前列か最後尾の屋外席から'],
'ゴンドラ乗船':['Gondola','細い運河を進む約30分の舟遊び。公定料金は1艘あたりで、最大5人まで乗れます（3人なら割り勘で）。','',''],
'アカデミア橋':["Ponte dell'Accademia",'木造の橋。サルーテ聖堂とカナル・グランデを望む、ヴェネツィアで一番人気の夕景スポットです。','','日没前後、サルーテ聖堂と運河'],
'サルーテ聖堂':['Santa Maria della Salute','ペストの終息を感謝して建てられた白いドームの聖堂。大運河の入口に立つ街のシンボルです。','',''],
'ブラーノ島':['Burano','家々がパステルカラーに塗られたレース編みの島。どこを切り取っても絵になります。水上バス12番線で約45分。','','晴れた日の午前〜昼、色が一番鮮やか'],
'ムラーノ島':['Murano','ヴェネツィアン・グラスの島。工房でガラス作りの実演を見学できます。','',''],
'サン・マルコの鐘楼':['Campanile di San Marco','高さ約99mの鐘楼。エレベーターで上がり、赤い屋根の街並みと潟を一望できます。','',''],
'サン・ジョルジョ・マッジョーレ教会':['San Giorgio Maggiore','対岸の小島に建つ教会。鐘楼からサン・マルコ広場を正面に見渡せる、写真好きの穴場です。','','鐘楼から夕方のサン・マルコ'],
'アカデミア美術館':["Gallerie dell'Accademia",'ティツィアーノ、ベッリーニ、ティントレットなど、ヴェネツィア派絵画の宝庫。','',''],
'ペギー・グッゲンハイム美術館':['Peggy Guggenheim Collection','運河沿いの邸宅で、ピカソ、ダリ、ポロックなど20世紀美術を楽しめます。火曜休館。','','']};
const TILE='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR='&copy; OpenStreetMap contributors &copy; CARTO';
let bkMaps=[],bkTiles=0,bkTilesDone=0;
const DOW_EN=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const txtOf=t=>typeof t==='function'?t():t;

function loadLeaflet(){return new Promise(res=>{if(window.L)return res();const l=document.createElement('link');l.rel='stylesheet';l.href='vendor/leaflet/leaflet.css';document.head.appendChild(l);const s=document.createElement('script');s.src='vendor/leaflet/leaflet.js';s.onload=()=>res();s.onerror=()=>res();document.head.appendChild(s)})}
function bkBudget(){const R=rate(),people=Math.max(1,+$('people').value||3),rooms=Math.ceil(people/3),entry=selected.reduce((a,x)=>a+priceYen(x),0),flight=+$('flight').value||0,food=+$('food').value||0;
 const hotel=regions.reduce((a,r)=>a+hotelInfo(r).eur*NIGHTS[r],0)*R*rooms/people,inter=transfers.reduce((a,t)=>a+t[3],0)*R,local=passes.reduce((a,p)=>a+p[2],0)*R;
 const rows=[['国際線往復',flight],['宿泊（10泊）',hotel],['食費（11日）',food*11],['都市間・空港の移動',inter],['市内交通',local],['入場・体験',entry]];return {rows,per:rows.reduce((a,r)=>a+r[1],0),people}}
const folio=(n,label)=>`<div class="folio"><span class="latin">EUROPE PHOTO JOURNEY 2027</span><span>${esc(label)} · ${n}</span></div>`;

function bkCover(){return `<section class="bk-page cover"><div class="cover-top"><div class="kicker" style="color:#d9c7a3">Spring 2027 · Travel Notebook</div>
<h1 class="latin"><small>EUROPE PHOTO JOURNEY</small>Paris<br>Mont-Saint-Michel<br>Venezia · Roma</h1>
<div class="sub serif">パリ、モン・サン・ミッシェル、ヴェネツィア、ローマをめぐる12日間</div>
<div class="route latin">TOKYO → PARIS → MONT-SAINT-MICHEL → PARIS → VENEZIA → ROMA → TOKYO</div></div>
<div class="map bk-map" data-map="overview" style="height:auto"></div>
<div class="cover-bottom"><div><b class="latin">3.11 — 3.23</b>2027 · 3人旅</div><div style="text-align:right">${selected.length}か所の観光地<br>10泊 · 4つの街</div></div></section>`}

function bkOverview(page){const B=bkBudget();
 const rows=days.map(D=>{if(D.pre)return `<tr><td class="d">${md(D.d)}（${wd(D.d)}）</td><td>東京 → パリ</td><td>夜の便で出発（機内泊）</td><td>—</td></tr>`;
  const regs=[...new Set(D.plan.filter(s=>s.r).map(s=>s.r))],spots=D.plan.filter(s=>s.r).flatMap(s=>itemsOf(s).map(x=>x.n));
  return `<tr><td class="d">${md(D.d)}（${wd(D.d)}）</td><td>${regs.map(r=>`<span class="dot" style="background:${CITY[r].c}"></span>${esc(r)}`).join(' → ')}${D.plan.some(s=>s.move)?`<br><span class="warnline">${D.d==='2027-03-12'?'到着日':'移動日'}</span>`:''}</td><td>${spots.length?esc(spots.join('、')):'自由時間'}</td><td>${D.night?esc(hn(D.night)):'機内泊'}</td></tr>`}).join('');
 return `<section class="bk-page"><div class="sec-h"><div class="kicker">Itinerary</div><h2 class="serif">旅のすべて、一枚で。</h2><p>13日間の行程と泊まる宿の一覧</p></div>
<table class="bk ov"><thead><tr><th style="width:17mm">DATE</th><th style="width:40mm">CITY</th><th>SPOTS</th><th style="width:40mm">STAY</th></tr></thead><tbody>${rows}</tbody></table>
<div class="cols" style="margin-top:5mm"><div class="box tight"><h4>🏨 宿泊するホテル</h4><ul>${regions.map(r=>`<li><b>${esc(r)}</b>（${NIGHTS[r]}泊）：${esc(hn(r))}</li>`).join('')}</ul></div>
<div class="box tight"><h4>💴 1人あたりの予算（目安）</h4><table class="bk">${B.rows.map(([n,v])=>`<tr><td>${n}</td><td style="text-align:right">${yen(v)}</td></tr>`).join('')}<tr><td><b>合計</b></td><td style="text-align:right"><b>${yen(B.per)}</b></td></tr></table><p style="margin:2mm 0 0;font-size:7.5pt;color:var(--soft)">1ユーロ＝${rate()}円。料金は2026年11月時点の目安。</p></div></div>${folio(page,'ITINERARY')}</section>`}

function bkPre(page){const D=days[0];
 return `<section class="bk-page" style="--c:#102e43"><div class="day-head"><div class="day-num latin"><small>DEPARTURE</small>00</div><div class="day-meta"><div class="en latin">TOKYO → PARIS</div><h2 class="serif">いよいよ出発。羽田から夜の便でパリへ</h2></div><div class="day-date"><b class="latin">3.11</b>THU</div></div>
<div class="day-grid"><div>${D.steps.map(([t,x])=>`<div class="tl-row"><span class="tl-time">${t==null?'':fmt(t)}</span><span>${esc(txtOf(x))}</span></div>`).join('')}<p style="color:var(--soft);font-size:8pt">${esc(D.note)}</p>
<h3 class="bk">出発前にやっておくこと</h3><ul class="check" style="padding-left:4.5mm">
<li>パスポートの残存期間を確認（シェンゲン協定国の出国予定日から3か月以上）</li>
<li>EUの渡航認証ETIAS：2026年11月時点では未開始。出発前に公式サイト（travel-europe.europa.eu）で必要かどうかを確認</li>
<li>海外旅行保険（クレジットカード付帯の条件も確認）</li>
<li>人気施設の予約：ルーヴル、コロッセオ、バチカン、ボルゲーゼなどは日時指定</li>
<li>都市間の列車・飛行機の予約（早いほど安い）</li>
<li>外務省の「たびレジ」に登録</li>
<li>スマホの海外通信（eSIMなど）とオフライン地図の準備</li>
<li>パスポートとクレジットカードの写真を保存しておく</li></ul></div>
<div class="side"><div class="box"><h4>🛂 入国のしくみ</h4>2025年10月からEUで出入国管理システム（EES）が始まり、初回の入国時に顔写真と指紋を登録します。シェンゲン圏内のフランス→イタリアは入国審査なし。</div>
<div class="box"><h4>🕗 時差</h4>パリ・ローマは日本の<b>8時間遅れ</b>。3/28から夏時間で7時間遅れに。</div>
<div class="box"><h4>🌤 3月の気候</h4>パリ・ヴェネツィアは最高12℃前後・最低4〜5℃、ローマは最高16℃前後。朝晩は冷えるので重ね着と雨具を。</div></div></div>${folio(page,'DEPARTURE')}</section>`}

function bkDay(D,dayNo,page){const regs=[...new Set(D.plan.filter(s=>s.r).map(s=>s.r))],main=regs[regs.length-1]||D.night||'ローマ',col=CITY[main].c;
 const sightSegs=D.plan.filter(s=>s.r),allItems=sightSegs.flatMap(s=>itemsOf(s));
 const isMove=D.plan.some(s=>s.move),moveTitle=(D.plan.find(s=>s.move)||{}).title||'';
 const title=isMove?moveTitle.replace(/（.*?）/g,'').replace('ローマ → 日本','ローマ最後の朝、そして帰国'):(allItems.length?[...allItems].sort((a,b)=>dur(b)-dur(a)).slice(0,2).map(x=>x.n).join('と')+(allItems.length>2?'へ':''):'自由に街歩き');
 let num=0;const parts=D.plan.map(s=>{if(s.move)return `<div class="tl-move"><div class="tt">🚆 ${esc(s.title)}</div>${s.steps.map(([t,x])=>`<div class="tl-row"><span class="tl-time">${t==null?'':fmt(t)}</span><span>${esc(txtOf(x))}</span></div>`).join('')}</div>`;
  const items=itemsOf(s);if(!items.length)return `<div class="seg-title">📍 ${esc(s.r)} <span>${s.label?esc(s.label):''}</span></div><p style="color:var(--soft)">予定なし（自由時間）</p>`;
  const T=timeline(items,s),base=num;num+=items.length;
  const rows=T.stops.map((st,i)=>{const p=priceYen(st.x),info=SPOT_INFO[st.x.n]||[];
   const meta=[`滞在${st.x.h}時間`,p?yen(p):'',knownHours(st.h)?`営業${fmt(st.h[0])}–${fmt(st.h[1])}`:'',st.lunchIn?'途中で昼食':''].filter(Boolean).join(' · ');
   return `${st.lunchAt!=null?`<div class="tl-row"><span class="tl-time">${fmt(st.lunchAt)}</span><span>🍽 昼食（約1時間）</span></div>`:''}<div class="tl-leg">${legIcon(st.leg.mode)} ${esc(st.leg.mode)} 約${Math.max(5,Math.round(st.leg.h*12)*5)}分${st.leg.detail?`<span class="st">${esc(st.leg.detail)}</span>`:''}</div>${st.wait>=.5?`<div class="tl-leg">☕ 自由時間 約${Math.round(st.wait*2)/2}時間</div>`:''}<div class="tl-row"><span class="tl-time">${fmt(st.arrive)}</span><span><span class="tl-num">${base+i+1}</span><b>${esc(st.x.n)}</b>${info[2]?`<span class="tag-r">予約${esc(info[2])}</span>`:''}<br><span class="m">${esc(meta)}</span>${st.closed?'<br><span class="warnline">⚠ この日は通常休館日</span>':st.late?'<br><span class="warnline">⚠ 閉館時刻を過ぎる可能性</span>':''}</span></div>`}).join('');
  return `<div class="seg-title">📍 ${esc(s.r)}の観光 <span>${fmt(T.start)}〜${fmt(T.end)}${s.label?' · '+esc(s.label):''}</span></div><div class="bk-map${isMove?' small':''}" data-map="seg" data-d="${s.d}" data-r="${esc(s.r)}" data-base="${base}"></div>
<div class="tl-row"><span class="tl-time">${fmt(T.start)}</span><span><span class="tl-num h">H</span>${esc(T.H.name)} を出発</span></div>${rows}<div class="tl-leg">${legIcon(T.back.mode)} ${esc(T.back.mode)} 約${Math.max(5,Math.round(T.back.h*12)*5)}分${T.back.detail?`<span class="st">${esc(T.back.detail)}</span>`:''}</div><div class="tl-row"><span class="tl-time"${T.home>T.limit+.01?' style="color:#a8483a"':''}>${fmt(T.home)}</span><span><span class="tl-num h">H</span>${esc(T.H.name)} に戻る</span></div>`}).join('');
 // side notes
 const reserve=allItems.filter(x=>(SPOT_INFO[x.n]||[])[2]),photos=allItems.filter(x=>(SPOT_INFO[x.n]||[])[3]),cost=allItems.reduce((a,x)=>a+priceYen(x),0);
 const sunNotes=regs.map(r=>`${esc(r)}：日の出 ${fmt(sunrise[r])}ごろ／日没 ${fmt(sunset[r])}ごろ`).join('<br>');
 const side=`<div class="box"><h4>🌅 光の時間</h4>${sunNotes}</div>
${reserve.length?`<div class="box"><h4>🎫 事前に予約</h4><ul>${reserve.map(x=>`<li>${esc(x.n)}（${esc(SPOT_INFO[x.n][2])}）</li>`).join('')}</ul></div>`:''}
${photos.length?`<div class="box"><h4>📷 撮影メモ</h4><ul>${photos.map(x=>`<li><b>${esc(x.n)}</b>：${esc(SPOT_INFO[x.n][3])}</li>`).join('')}</ul></div>`:''}
<div class="box"><h4>💴 今日の入場料</h4><span class="big">${yen(cost)}</span>1人あたり（交通・食事は別）</div>
${D.night?`<div class="box"><h4>🏨 今夜の宿</h4>${esc(hn(D.night))}<br><span style="color:var(--soft)">${esc(hotelInfo(D.night).area)}</span></div>`:`<div class="box"><h4>✈️ 帰国</h4>夕方〜夜の便でローマを出発、3/23に日本着。</div>`}`;
 const dt=D.d,dw=DOW_EN[dow(dt)];
 return `<section class="bk-page" style="--c:${col}"><div class="day-head"><div class="day-num latin"><small>DAY</small>${String(dayNo).padStart(2,'0')}</div><div class="day-meta"><div class="en latin">${regs.map(r=>CITY[r].en).join(' → ')}</div><h2 class="serif">${esc(title)}</h2></div><div class="day-date"><b class="latin">${+dt.slice(5,7)}.${+dt.slice(8)}</b>${dw}</div></div>
<div class="day-grid${D.plan.length>2?' compact':''}"><div>${parts}</div><div class="side">${side}</div></div>${folio(page,'DAY '+String(dayNo).padStart(2,'0'))}</section>`}

function bkGuide(r,startPage){const items=selected.filter(x=>x.r===r);if(!items.length)return [];
 const cards=items.map(x=>{const info=SPOT_INFO[x.n]||[x.n,x.tag==='自由追加'?'自分で追加した場所':'','',''],p=priceYen(x),st=stOf(x),h=venueHours(x,'2027-03-17');
  return `<div class="spot-card"><div class="en latin">${esc(info[0]||'')}</div><h4 class="serif">${esc(x.n)}${info[2]?`<span class="tag-r">予約${esc(info[2])}</span>`:''}</h4><p>${esc(info[1]||'')}</p><div class="facts">⏱ 滞在の目安 ${x.h}時間 · 💴 ${p?yen(p)+(x.eur!=null?`（€${x.eur}）`:''):'無料'}${knownHours(h)?` · 🕘 ${fmt(h[0])}–${fmt(h[1])}`:''}${st?` · 🚇 ${esc(st[0])}`:''}</div>${info[3]?`<div class="photo">📷 ${esc(info[3])}</div>`:''}</div>`});
 const pages=[];for(let i=0;i<cards.length;i+=8)pages.push(cards.slice(i,i+8));
 return pages.map((cs,pi)=>`<section class="bk-page" style="--c:${CITY[r].c}"><div class="sec-h"><div class="kicker">City Guide · ${CITY[r].en}</div><h2 class="serif">${esc(r)}${pi?'（つづき）':''}</h2></div>${pi?'':`<div class="city-intro">${esc(CITY_INTRO[r])}</div>`}<div class="spot-grid">${cs.join('')}</div>${folio(startPage+pi,'CITY GUIDE')}</section>`)}

function bkTransport(page){return `<section class="bk-page"><div class="sec-h"><div class="kicker">How to get around</div><h2 class="serif">交通のきほん</h2><p>切符の買い方と乗り方。改札や乗り場での「タッチ」を忘れずに</p></div>
<div class="cols"><div><h3 class="bk" style="--c:${CITY['パリ'].c}">パリ</h3><ul><li>紙の切符は廃止。駅の窓口・券売機でICカード <b>Navigo Easy</b>（€2）を買い、<b>1日券 Navigo Jour（€12.30）</b>か1回券（€2.55）をチャージ。スマホのアプリ（Bonjour RATP など）でも買える</li><li>メトロもRERも改札でタッチ。RERは降りるときも改札を通る</li><li>空港（CDG・オルリー）へは専用の空港券（€14）が必要。1日券では行けない</li><li>RER Bは混雑時スリが多い。荷物から目を離さない</li></ul>
<h3 class="bk" style="--c:${CITY['モン・サン・ミッシェル'].c}">モン・サン・ミッシェル</h3><ul><li>パリからは列車＋バス。SNCF Connect で通しで予約できる</li><li>ホテル街から島へは無料シャトル「Le Passeur」（約12分）。歩いても約40分</li></ul></div>
<div><h3 class="bk" style="--c:${CITY['ヴェネツィア'].c}">ヴェネツィア</h3><ul><li>水上バス（ヴァポレット）は <b>72時間券（€45）</b>が便利。1回券は€9.50と高い</li><li>乗る前に乗り場の読み取り機にカードをタッチ（乗るたびに必要）</li><li>同じ番号でも方向が2つあるので、行き先表示を確認</li><li>ブラーノ島へは Fondamente Nove から12番線</li></ul>
<h3 class="bk" style="--c:${CITY['ローマ'].c}">ローマ</h3><ul><li>クレジットカードのタッチ決済で改札を通れる（1日の上限€8.50）。72時間券（€22）も</li><li>バスは乗ったらすぐ車内の機械で打刻。打刻なしは罰金</li><li>地下鉄はA線・B線が中心。スリが多いので混雑した車両は避ける</li></ul>
<h3 class="bk">都市間の移動</h3><ul>${transfers.map(t=>`<li>${t[0]} ${esc(t[1])}：${esc(t[2])}（目安€${t[3]}）</li>`).join('')}</ul></div></div>${folio(page,'TRANSPORT')}</section>`}

function bkSafety(page){return `<section class="bk-page"><div class="sec-h"><div class="kicker">Safety &amp; Checklist</div><h2 class="serif">安心して旅するために</h2><p>トラブル対策と緊急連絡先、持ち物リスト</p></div>
<div class="cols"><div><div class="box" style="border-color:#a8483a"><h4>🚨 緊急連絡先</h4><ul><li><b>112</b>：警察・救急・消防（EU共通・無料）</li><li><b>在フランス日本国大使館</b>：+33-1-4888-6200（閉館時も緊急対応）<br>7, avenue Hoche, 75008 Paris</li><li><b>在イタリア日本国大使館</b>：+39-06-487991<br>Via Quintino Sella 60, Roma</li><li>クレジットカード会社の紛失・盗難窓口：＿＿＿＿＿＿</li><li>海外旅行保険の緊急窓口：＿＿＿＿＿＿</li></ul></div>
<h3 class="bk">よくある手口と対策</h3><ul><li>メトロや観光地のスリ：バッグは前に抱え、ファスナー付きのものを。スマホを机に置かない</li><li>署名を求めるアンケート、ミサンガを腕に巻いてくる人：相手にせず立ち去る</li><li>夜は大通りを歩き、遅くなったら地下鉄かタクシー（正規のタクシー乗り場から）</li><li>パスポートはホテルの金庫へ。持ち歩くのはコピーと必要な分の現金だけ</li><li>盗難にあったら警察で被害届（証明書）をもらう。保険の請求に必要</li></ul></div>
<div><h3 class="bk" style="margin-top:0">持ち物チェックリスト</h3><ul class="check" style="padding-left:4.5mm"><li>パスポート（＋コピー・写真データ）</li><li>航空券・列車・施設の予約確認（スマホ＋スクリーンショット）</li><li>クレジットカード2枚以上（タッチ決済対応）</li><li>ユーロの現金（少額でOK）</li><li>海外旅行保険の証書</li><li>変換プラグ（Cタイプ）・モバイルバッテリー</li><li>歩きやすい靴（石畳が多い）</li><li>重ね着できる服・薄手のダウン・折りたたみ傘</li><li>教会用の羽織り・ストール（肩と膝を隠す）</li><li>カメラ・予備バッテリー・SDカード・三脚（夜景用）</li><li>常備薬・マスク</li><li>エコバッグ（スーパーでは袋が有料）</li></ul>
<h3 class="bk">旅のひとこと</h3><div class="phr"><div class="hd">日本語</div><div class="hd">フランス語</div><div class="hd">イタリア語</div>
<div>こんにちは</div><div>Bonjour</div><div>Buongiorno</div><div>ありがとう</div><div>Merci</div><div>Grazie</div><div>お願いします</div><div>S'il vous plaît</div><div>Per favore</div><div>すみません</div><div>Excusez-moi</div><div>Scusi</div><div>お会計を</div><div>L'addition, s'il vous plaît</div><div>Il conto, per favore</div><div>〜はどこ？</div><div>Où est … ?</div><div>Dov'è … ?</div></div></div></div>${folio(page,'SAFETY')}</section>`}

function bkMemo(page){return `<section class="bk-page"><div class="sec-h"><div class="kicker">Memories</div><h2 class="serif">旅の記録</h2><p>撮った写真を貼ったり、思い出を書き込んだり</p></div><div class="memo-lines"></div><div class="photo-frames"><div>PHOTO</div><div>PHOTO</div><div>PHOTO</div><div>PHOTO</div></div>${folio(page,'MEMO')}</section>`}

function buildBooklet(){let p=2;const out=[bkCover(),bkOverview(p++),bkPre(p++)];let dayNo=1;
 for(const D of days.slice(1)){out.push(bkDay(D,dayNo++,p++))}
 for(const r of regions){const g=bkGuide(r,p);p+=g.length;out.push(...g)}
 out.push(bkTransport(p++),bkSafety(p++),bkMemo(p++));return out.join('')}

function bkPin(n,color,h){return L.divIcon({className:'',html:`<div class="bk-pin${h?' h':''}" style="background:${color}">${h?'H':n}</div>`,iconSize:[22,22],iconAnchor:[11,11]})}
function initBookletMaps(){bkMaps.forEach(m=>m.remove());bkMaps=[];bkTiles=0;bkTilesDone=0;if(!window.L)return;
 document.querySelectorAll('#bk-pages [data-map]').forEach(el=>{const map=L.map(el,{zoomControl:false,attributionControl:true,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false,tap:false,zoomSnap:.25,fadeAnimation:false,zoomAnimation:false,markerZoomAnimation:false});
  map.attributionControl.setPrefix(false);
  const tl=L.tileLayer(TILE,{subdomains:'abcd',maxZoom:19,attribution:TILE_ATTR,crossOrigin:true});tl.on('tileloadstart',()=>bkTiles++);tl.on('tileload tileerror',()=>bkTilesDone++);tl.addTo(map);
  if(el.dataset.map==='overview'){const pts=['パリ','モン・サン・ミッシェル','パリ','ヴェネツィア','ローマ'].map(r=>[CITY[r].lat,CITY[r].lon]);
   L.polyline(pts,{color:'#d9c7a3',weight:3,dashArray:'6 6'}).addTo(map);
   for(const r of regions)L.marker([CITY[r].lat,CITY[r].lon],{icon:L.divIcon({className:'',html:`<div class="bk-city-label">${esc(r)}</div>`,iconSize:null,iconAnchor:[0,0]})}).addTo(map);
   map.fitBounds(L.latLngBounds(pts),{padding:[40,40]})}
  else{const s=segOf(el.dataset.d,el.dataset.r),items=itemsOf(s),H=hotelFor(s.r),col=CITY[s.r].c,base=+el.dataset.base||0;
   const pts=[[H.lat,H.lon],...items.filter(x=>x.lat).map(x=>[x.lat,x.lon]),[H.lat,H.lon]];
   L.polyline(pts,{color:col,weight:3,opacity:.75,dashArray:'2 7',lineCap:'round'}).addTo(map);
   L.marker([H.lat,H.lon],{icon:bkPin(0,col,true)}).addTo(map);
   items.forEach((x,i)=>{if(x.lat)L.marker([x.lat,x.lon],{icon:bkPin(base+i+1,col)}).addTo(map)});
   map.fitBounds(L.latLngBounds(pts),{padding:[28,28],maxZoom:16})}
  bkMaps.push(map)})}
function fitBookletZoom(){const pages=$('bk-pages');if(!pages)return;const w=Math.min(1,(window.innerWidth-12)/pages.offsetWidth);pages.style.zoom=w<1?w:''}
async function openBooklet(){let el=$('booklet');if(!el){el=document.createElement('div');el.id='booklet';el.innerHTML=`<div id="bk-bar"><button class="close" data-bk="close">← 戻る</button><span class="t">印刷画面で「PDFとして保存」（iPhoneは共有→「ファイルに保存」）</span><button class="print" data-bk="print">PDFで保存</button></div><div id="bk-scroll"><div id="bk-pages"></div></div>`;document.body.appendChild(el)}
 ensureAssignments();$('bk-pages').innerHTML=buildBooklet();document.body.classList.add('bk-open');el.classList.remove('hide');window.scrollTo(0,0);fitBookletZoom();
 await loadLeaflet();initBookletMaps()}
function closeBooklet(){document.body.classList.remove('bk-open');const el=$('booklet');if(el)el.classList.add('hide');bkMaps.forEach(m=>m.remove());bkMaps=[];showPage('plan')}
async function printBooklet(){const t0=Date.now();const bar=document.querySelector('#bk-bar .t'),msg=bar.textContent;bar.textContent='地図を読み込んでいます…';while(bkTilesDone<bkTiles&&Date.now()-t0<8000)await new Promise(r=>setTimeout(r,250));bar.textContent=msg;window.print()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-bk]');if(!b)return;const a=b.dataset.bk;if(a==='open')openBooklet();else if(a==='close')closeBooklet();else if(a==='print')printBooklet()});
addEventListener('resize',()=>{if(document.body.classList.contains('bk-open'))fitBookletZoom()});
