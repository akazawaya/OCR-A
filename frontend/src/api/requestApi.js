
// fetch()はHTTPステータスが404が500で返る場合はresを返すためres.ok等、resのプロパティで処理が可能だが、
//　ネットワーク層の失敗は返り値がない、例外となるため　try/catch→throwでエラーを拾う必要がある

// fetchのラッパーからhttpエラーとネットワークエラーの処理までを担当
// とりあえずalert()でエラー表示できればOK
// 返り値はresとjson(data)とする　dataもres.json()で取得するためresに吸収できそうだが、json変換の処理を分けておきたいので個別実装
// いずれプロパティまで獲得する関数、idも含める関数も作成したい

export async function requestApi(url, options = {}) {
  try {
    const res = await fetch(url, {headers: { Accept: "application/json"},
																	...options}); 
		// 204 No Contentの場合はjson()が失敗するため処理を分ける　.catch()は直前のawait　promiseがエラーの時、内部の関数を実行する
		const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      alert(`HTTP Error:${res.status}`);
    }
    return { res, data };

	}catch(e){
		alert(`Network Error: ${e.message}`)
		return { res: null, data: null };
	}
};