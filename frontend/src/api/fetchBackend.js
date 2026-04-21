// fetch()はHTTPステータスが404が500で返る場合はresを返すためres.ok等、resのプロパティで処理が可能だが、
//　ネットワーク層の失敗は返り値がない、例外となるため　try/catch→throwでエラーを拾う必要がある

// fetchのラッパーからhttpエラーとネットワークエラーの処理までを担当
// とりあえずalert()でエラー表示できればOK
// 返り値はresとjson(data)とする　dataもres.json()で取得するためresに吸収できそうだが、json変換の処理を分けておきたいので個別実装

// optionsには通常のfetchオプションに加えて、throwOnErrorを追加→trueの場合、エラー時に例外を上位にthrowする（fetchBackendがfor文の内側など、下位側に属する時に使用）
// 呼び出し先では、　try {...} catch {空}で完結できる想定

export const fetchBackend = async (url, options = {}) => {
  const { throwOnError = false, ...fetchOptions } = options; //fetchBackendをfor文で回す様なとき、上位のfor/try-catchに対して中断&エラー伝達が可能になる様にする
  const headers = {
    Accept: "application/json",
    ...(fetchOptions.headers ?? {}),
  };

  try {
    const res = await fetch(url, { ...fetchOptions, headers });
    // 204 No Contentの場合はjson()が失敗するため処理を分ける　.catch()は直前のawait　promiseがエラーの時、内部の関数を実行する
    const data = res.status === 204 ? null : await res.json().catch(() => null);

    if (!res.ok) {
      console.log(`HTTP Error:${res.status}`);
      if (throwOnError) {
        // 例外にして上位のfor/try-catchで中断できるようにする
        throw new Error(`HTTP Error:${res.status}`);
      }
    }
    return { res, data };
  } catch (e) {
    console.log(`Network Error: ${e.message}`);
    if (throwOnError) throw e; // 上位にeを投げる
    return { res: null, data: null };
  }
};
