import grpc from "@grpc/grpc-js";
import protoloader from "@grpc/proto-loader";

const packagedef = protoloader.loadSync("../proto/proto_services/video.proto", {
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(packagedef);

export const videoPackage = grpcObject.video;

export const video_protoclient = new videoPackage.VideoService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);
