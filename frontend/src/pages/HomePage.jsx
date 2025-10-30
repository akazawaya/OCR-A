import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentSchemaConfig, documentSchemaConfig, pageSchemaConfig, wordSchemaConfig } from "../route"

  const Home = () =>{
    return (
      <>
      <p>home</p>
      <FileUploader config={analyzeDocumentSchemaConfig}/>
      <Table config={documentSchemaConfig}/>
      <Table config={pageSchemaConfig}/>
      <Table config={wordSchemaConfig}/>
      </>
    )
  }
  export default Home