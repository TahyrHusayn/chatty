use {
    futures_util::{SinkExt, StreamExt},
    hyper::{
        service::{make_service_fn, service_fn},
        Body, Request, Response, Server, StatusCode,
    },
    hyper_tungstenite::tungstenite::Message,
    hyper_tungstenite::{is_upgrade_request, upgrade},
    std::{
        collections::HashMap,
        convert::Infallible,
        net::SocketAddr,
        sync::{
            atomic::{AtomicUsize, Ordering},
            Arc,
        },
    },
    tokio::sync::{mpsc, Mutex},
};

// A unique ID for each client connection.
static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

// We'll use a HashMap to store the sender parts of our connections.
type Peers = Arc<Mutex<HashMap<usize, mpsc::UnboundedSender<Message>>>>;

async fn handle_request(
    mut req: Request<Body>,
    peers: Peers,
) -> Result<Response<Body>, Infallible> {
    if is_upgrade_request(&req) {
        let (response, websocket) = upgrade(&mut req, None).unwrap();

        // Spawn a new task to handle this specific client's connection.
        tokio::spawn(async move {
            let ws_stream = websocket.await.unwrap();
            let (mut ws_sender, mut ws_receiver) = ws_stream.split();

            // Get a new unique ID for this client.
            let my_id = NEXT_USER_ID.fetch_add(1, Ordering::Relaxed);

            // Create a channel for this client.
            let (tx, mut rx) = mpsc::unbounded_channel();

            // Add the client's sender to the shared state.
            peers.lock().await.insert(my_id, tx);

            // Forward messages from the broadcast channel to the websocket client.
            tokio::spawn(async move {
                while let Some(msg) = rx.recv().await {
                    ws_sender.send(msg).await.ok();
                }
            });

            // Handle incoming messages from the client and broadcast them.
            while let Some(Ok(msg)) = ws_receiver.next().await {
                if msg.is_close() {
                    break;
                }

                // Clone the senders we need inside the lock, then release the lock.
                let senders: Vec<_> = {
                    let peers_map = peers.lock().await;
                    peers_map
                        .iter()
                        .filter(|(&peer_id, _)| my_id != peer_id) // Filter out the sender
                        .map(|(_, tx)| tx.clone()) // Clone the sender channel
                        .collect()
                };

                // Now, send the messages without holding the lock.
                for tx in senders {
                    tx.send(msg.clone()).ok();
                }
            }
            // The client has disconnected. Remove them from the peers map.
            println!("Client {} disconnected.", my_id);
            peers.lock().await.remove(&my_id);
        });

        Ok(response)
    } else {
        let mut response = Response::new(Body::empty());
        *response.status_mut() = StatusCode::NOT_FOUND;
        Ok(response)
    }
}

#[tokio::main]
async fn main() {
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".into());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();

    let peers = Peers::new(Mutex::new(HashMap::new()));

    let make_svc = make_service_fn(move |_| {
        let peers = peers.clone();
        async move { Ok::<_, Infallible>(service_fn(move |req| handle_request(req, peers.clone()))) }
    });

    let server = Server::bind(&addr).serve(make_svc);
    println!("Listening on http://{}", addr);

    if let Err(e) = server.await {
        eprintln!("server error: {}", e);
    }
}
