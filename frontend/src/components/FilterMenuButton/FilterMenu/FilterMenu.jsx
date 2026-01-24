export const FilterMenu = ({
  data:{conditions},
  navigation:{onClickSearchButton},
  options:{onChangeConditions}
  }) => {

  
  return (
    <div>
      <input type="text" value={conditions[0].value} 
              onChange={onChangeConditions}/>
      <button  onClick={onClickSearchButton} >検索実行</button>
    </div>
  );
};
