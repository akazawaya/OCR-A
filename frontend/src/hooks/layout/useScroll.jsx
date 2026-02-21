/**
 * useScroll.jsx
 *
 * 責務:
 * 依存値の変化をトリガーに、rootRef配下のelementのうち、
 * targetAttrName/targetAttrValueに一致するattributeName/attributeValueを持つelementを検索する。
 * 一致した場合、対象elementまでscrollIntoViewでスクロールする。
 * 見つからない場合は何もしない。
 *
 * @param {Object} options
 * - options object（名前付き引数）として受け取る。
 *
 * @param {import("react").RefObject<HTMLElement>} options.rootRef
 * - 検索対象の起点として、DOMのelementのrootを格納したref
 *
 * @param {string} options.targetAttrName
 * - 検索対象となるelementのattributeName
 *   呼び出し側では、後述するtargetAttrValueと検索で一致するような値を事前に作成する必要がある。
 *
 * @param {string | number} options.targetAttrValue
 * - 検索対象となるelementのattributeValue。副作用のトリガーを兼ねる。
 * - targetAttrNameと組み合わせて、検索を実施する。
 *
 * @param {boolean} [options.shouldScroll=true]
 * - 任意: スクロール実行の可否を制御するフラグ。
 * - 例えば component 間の追随スクロールでは、起点ではない側に true を渡してスクロールし、
 *   起点側には false を渡して不要なスクロールを抑止する。
 *
 * @returns {void}
 *
 * 特筆事項:
 * - 呼び出し側DOMが検索用に、一意に特定できるattributeName / attributeValueの組を持っている必要がある。
 * 　"key"を使えればよかったのだが、これはDOM属性として出力されない。
 *
 * - ReactでDOMを操作可能にする方法として、refを経由することが定石。
 * 　よって、呼び出し側のcomponentがrefを作成し、useScrollが受け取る責務とする。
 *
 * - ref.currentの変化はReactの依存配列では追跡されない。
 *   また、ref.currentの更新自体は再レンダリングを発生させない。
 *   よって。depsにrootRefを含めても、currentの変化を検知しないため、
 *   useEffectの依存にrootRefは含めない。
 */

import { useEffect } from "react";

export const useScroll = ({
  rootRef,
  targetAttrName,
  targetAttrValue,
  shouldScroll = true,
}) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!shouldScroll) return;

    const element = root.querySelector(
      `[${targetAttrName}="${targetAttrValue}"]`,
    );
    if (!element) return;

    element.scrollIntoView({ behavior: "auto", block: "start" });
  }, [targetAttrName, targetAttrValue, shouldScroll]);
};
