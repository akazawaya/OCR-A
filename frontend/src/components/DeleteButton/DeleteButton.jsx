import { requestApi } from "../../api/requestApi";
import { useRefresh } from "../../contexts/refreshContext";

const deleteData = async(deleteByIdUrl) =>{
	const { res, data } = await requestApi(
		deleteByIdUrl,{method: 'DELETE'});
	return { res, data };
};

export default function DeleteButton({deleteByIdUrl}) {
	// onResultのonはonClickのようなイベントハンドラという意味合い
	const onRefresh = useRefresh();
	const handleDelete = async () => {
  	const { res, data } = await deleteData(deleteByIdUrl);
    if (res?.ok) 
		onRefresh();
      
  };

  return (
  	<button onClick={handleDelete}>
			削除
		</button>
  )
};
