import asyncio
import json
import re
from pydantic import BaseModel
from google import genai
from google.genai import types

class TreeAnalysisModel(BaseModel):
    overall_health: str
    structural_weaknesses: list[str]
    disease_signs: list[str]
    decay: list[str]
    safety_recommendations: list[str]
    safety_score: int
    safe_to_park: bool
    status_level: str

async def analyze_tree(image_bytes: bytes, mime_type: str, api_keys: list[str]) -> dict:
    prompt = "Act as an expert arborist. Analyze this image of a tree and identify any signs of structural weakness, disease, decay, and other hazards. Provide a safety assessment and recommendations. You must also calculate a 'safety_score' out of 10 (10 being perfectly healthy/safe, 1 being extremely dangerous/dead), indicate if it is 'safe_to_park' under the tree (boolean), and assign a 'status_level' (must be exactly 'Safe', 'Warning', or 'Dangerous')."
    
    if not api_keys:
        raise Exception("No Gemini API keys provided in environment.")
        
    last_error = "Unknown Error"
    
    for api_key in api_keys:
        try:
            client = genai.Client(api_key=api_key)
            
            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            
            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-2.5-flash",
                contents=[image_part, prompt],
                config={
                    "temperature": 0.2,
                    "response_mime_type": "application/json",
                    "response_schema": TreeAnalysisModel,
                }
            )
            
            try:
                data = json.loads(response.text)
            except:
                clean = re.sub(r'```(?:json)?|```', '', response.text).strip()
                data = json.loads(clean)
                
            return data
            
        except Exception as loop_e:
            last_error = str(loop_e)
            
    raise Exception(f"All keys failed to analyze tree. Last error: {last_error}")
