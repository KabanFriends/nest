FROM mcr.microsoft.com/devcontainers/javascript-node

USER root
RUN apt-get update && apt-get install -y socat supervisor

USER node
RUN curl -L "https://github.com/Owlfroggy/terracotta/releases/download/v0.4.0/terracotta-linux-x64.gz" -o /tmp/terracotta-linux-x64.gz \
	&& mkdir -p ~/.vscode-server/data/User/globalStorage/owlfroggy.terracotta/versions/0.4.0 \
	&& gunzip -c /tmp/terracotta-linux-x64.gz > ~/.vscode-server/data/User/globalStorage/owlfroggy.terracotta/versions/0.4.0/terracotta-linux-x64 \
	&& chmod +x ~/.vscode-server/data/User/globalStorage/owlfroggy.terracotta/versions/0.4.0/terracotta-linux-x64 \
	&& rm -f /tmp/terracotta-linux-x64.gz

ENV PATH="~/.vscode-server/data/User/globalStorage/owlfroggy.terracotta/versions/0.4.0:${PATH}"
