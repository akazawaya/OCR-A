import Table from "../components/Table/Table"
import { documentSchemaConfig, pageSchemaConfig, wordSchemaConfig } from "../route"

  const Home = () =>{
    return (
      <>
      <p>home</p>
      <Table config={documentSchemaConfig}></Table>
      <Table config={pageSchemaConfig}></Table>
      <Table config={wordSchemaConfig}></Table>
      </>
    )
  }
  export default Home