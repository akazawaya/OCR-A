
const deleteData = async(deleteByIdUrl) =>{
	try{
	const res = await fetch(deleteByIdUrl,{method: 'DELETE'});
	onResult?.(res);
	}catch(e){
		console.error(e);
	}
};

export default function DeleteButton({deleteByIdUrl, onResult}) {
	// onResultのonはonClickのようなイベントハンドラという意味合い
  return (
  	<button onClick={() => deleteData(deleteByIdUrl)}>
			削除
		</button>
  )
};
