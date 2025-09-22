# ---- Build Stage ----
# Use the official slim Rust image as a builder
FROM rust:slim AS build

# Add the MUSL target
RUN rustup target add x86_64-unknown-linux-musl

# Create a new empty shell project
WORKDIR /app

# 1. Copy dependency files
COPY Cargo.toml Cargo.lock ./

# 2. Build a dummy file to cache dependencies
RUN mkdir src && \
    echo "fn main(){}" > src/main.rs && \
    cargo build --release --target x86_64-unknown-linux-musl

# 3. Copy your actual source code
COPY ./src ./src

# 4. Build the real project, using the cached dependencies
RUN cargo build --release --target x86_64-unknown-linux-musl


# ---- Final Stage ----
# Use the minimal "static" distroless image, which is perfect for MUSL builds
FROM gcr.io/distroless/static-debian11

# Copy the compiled binary from the correct MUSL target folder
COPY --from=build /app/target/x86_64-unknown-linux-musl/release/wss /

# Set the binary as the entrypoint
CMD ["/wss"]
