export default function DeleteButton({ events: { onClick } = {} }) {
  const handleRowDelete = () => {
    onClick();
  };

  return <button onClick={handleRowDelete}>削除</button>;
}
