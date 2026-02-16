export default function DeleteButton({ onClick }) {
  const handleRowDelete = () => {
    onClick();
  };

  return <button onClick={handleRowDelete}>削除</button>;
}
