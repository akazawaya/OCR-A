export const FilterMenu = ({
  data:{conditions},
  navigation:{onSearchButtonClick},
  options:{onChangeConditions}
  }) => {

  
  return (
    <div>
      <input type="text" value={conditions[0].value} 
              onChange={onChangeConditions}/>
      <button  onClick={onSearchButtonClick} >検索実行</button>
    </div>
  );
};
