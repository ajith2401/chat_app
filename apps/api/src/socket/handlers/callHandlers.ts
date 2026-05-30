import { Socket, Server } from "socket.io";

export const callHandlers = (io: Server, socket: Socket) => {
  const user = (socket as any).user;
  const relationshipRoom = `relationship:${user.relationshipId}`;

  socket.on("call_offer", (data: { offer: any }) => {
    socket.to(relationshipRoom).emit("call_offer", {
      offer: data.offer,
      from: user._id,
    });
  });

  socket.on("call_answer", (data: { answer: any }) => {
    socket.to(relationshipRoom).emit("call_answer", {
      answer: data.answer,
      from: user._id,
    });
  });

  socket.on("ice_candidate", (data: { candidate: any }) => {
    socket.to(relationshipRoom).emit("ice_candidate", {
      candidate: data.candidate,
      from: user._id,
    });
  });

  socket.on("call_ended", () => {
    socket.to(relationshipRoom).emit("call_ended", {
      from: user._id,
    });
  });
};
