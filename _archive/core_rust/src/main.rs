use tonic::{transport::Channel, Request};
use morphs::ml_worker_client::MlWorkerClient;
use morphs::InferenceRequest;

pub mod morphs {
    tonic::include_proto!("morphs");
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("[Brain] Rust Orchestrator started. Attempting to connect to Python Worker...");

    // Подключение к gRPC-серверу на Python
    let mut client = MlWorkerClient::connect("http://[::1]:50051").await?;

    println!("[Brain] Connected! Dispatching Morphs...");

    let request = Request::new(InferenceRequest {
        morph_id: "morph_001".into(),
        prompt: "System: You are an execution agent. Task: Check database status.".into(),
        temperature: 0.2,
    });

    let response = client.run_inference(request).await?;

    println!("[Brain] Received completion from MLX Worker: {:?}", response.into_inner().completion);

    Ok(())
}
