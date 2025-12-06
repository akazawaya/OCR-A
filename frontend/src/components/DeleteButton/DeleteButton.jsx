export default function DeleteButton({ onDelete }) {
  const handleClick = () => {
    onDelete();  
  };

  return (
  	<button onClick={handleClick}>
			削除
		</button>
  )
};
