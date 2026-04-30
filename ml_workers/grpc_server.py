from concurrent import futures
import logging
import grpc
import morphs_pb2
import morphs_pb2_grpc

class MlWorkerServicer(morphs_pb2_grpc.MlWorkerServicer):
    def RunInference(self, request, context):
        morph_id = request.morph_id
        prompt = request.prompt
        
        logging.info(f"[MLX Worker] Received inference task for {morph_id}")
        
        # Заглушка для MLX: model.generate(prompt)
        completion = f"<Worker completed task for {morph_id}: Generated response for '{prompt}'>"
        
        return morphs_pb2.InferenceResponse(
            completion=completion,
            tokens_used=42,
            success=True
        )

    def ReportReward(self, request, context):
        logging.info(f"[Atropos RL] Saved reward {request.reward} for {request.execution_trajectory_id}")
        return morphs_pb2.AckResponse(received=True)

def serve():
    port = '50051'
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    morphs_pb2_grpc.add_MlWorkerServicer_to_server(MlWorkerServicer(), server)
    server.add_insecure_port('[::]:' + port)
    server.start()
    logging.info(f"Python gRPC Worker started, listening on {port}")
    server.wait_for_termination()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    serve()
