import { requestApi } from "../../api/requestApi";

const deleteData = async(deleteByIdUrl) =>{
	const { res, data } = await requestApi(
		deleteByIdUrl,{method: 'DELETE'});
	return { res, data };
};

export default function DeleteButton({deleteByIdUrl, onSuccess}) {
	// onResultのonはonClickのようなイベントハンドラという意味合い

	const handleDelete = async () => {
  	const { res, data } = await deleteData(deleteByIdUrl);
    if (res?.ok) 
      onSuccess?.(data);
  };

  return (
  	<button onClick={handleDelete}>
			削除
		</button>
  )
};
