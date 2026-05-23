/**
 * useScroll.js
 *
 * 責務:
 * 依存値の変化をトリガーに、rootRef配下のelementのうち、
 * targetAttrName/targetAttrValueに一致するattributeName/attributeValueを持つelementを検索する。
 * 一致した場合、対象elementまでscrollIntoViewでスクロールする。
 * 見つからない場合は何もしない。
 *

 * 特筆事項:
 * - 呼び出し側DOMが検索用に、一意に特定できるattributeName / attributeValueの組を持っている必要がある。
 * 　"key"を使えればよかったのだが、これはDOM属性として出力されない。
 *
 * - ReactでDOMを操作可能にする方法として、refを経由することが定石。
 * 　よって、呼び出し側のcomponentがrefを作成し、useScrollが受け取る責務とする。
 *
 * - ref.currentの変化はreactの依存配列では追跡されない。
 *   また、ref.currentの更新自体は再レンダリングを発生させない。
 * - 依存配列に含められるのはrootRef（refオブジェクト）であり、currentの変化は検知できない。
 * - ただし、effect内でrootRefを参照しているため参照整合性の観点からdepsにrootRefを含める。
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

    element.scrollIntoView({
      behavior: "instant",
      container: "nearest",
    });
  }, [rootRef, targetAttrName, targetAttrValue, shouldScroll]);
};
