import { analyzeImageByUrl, analyzeLocalImage } from "./services/recipeService.js";
import "dotenv/config";
import path from "path";
async function test() {
    try {
        console.log("Testing analyzeImageByUrl with gemini-2.5-flash...");
        const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/800px-Good_Food_Display_-_NCI_Visuals_Online.jpg";
        const resultUrl = await analyzeImageByUrl(imageUrl);
        console.log("Result URL:", JSON.stringify(resultUrl, null, 2));
        console.log("\nTesting analyzeLocalImage with gemini-2.5-flash...");
        const localPath = path.resolve("test-image.jpg");
        const resultLocal = await analyzeLocalImage(localPath);
        console.log("Result Local:", JSON.stringify(resultLocal, null, 2));
    }
    catch (error) {
        console.error("Error:", error);
    }
}
test();
