//　検索機能はクエリパラメータ(URL末尾の?以降)をクエリに付け足すことで実行可能（backendでの許可が前提）
// よって、fetchのGETリクエストの延長として実装できる
import { useState } from "react";
import { FilterMenu } from "./FilterMenu/FilterMenu";

export function FilterMenuButton({
    data: { search = "" } = {},
    navigation: { onSearchButtonClick } = {},
    options: {
      onChangeConditions = () => {},
      onFilterMenuButtonClick = () => {},
    } = {},
  } = {}
) {
  const [open, setOpen] = useState(false);
  
  //onFilterMenuButtonClick は　今は冗長だがhooks分離するための伏線
  const toggleFilterMenu = async () => {
      setOpen(prev => !prev);
  };

  return (
    <div>
      <button type="button" onClick={toggleFilterMenu}>
        検索メニュー
      </button>

      <div style={{ display: open ? "block" : "none" }}>
      <FilterMenu data={{search}}
        options={{
        onSearchButtonClick:onSearchButtonClick,
        onChangeConditions:onChangeConditions
        }}
      />
      </div>
    </div>
  );
}

