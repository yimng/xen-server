Name: vStorage 	
Version: 5.2.1	
Release:	1%{?dist}
Summary: vStorage for vGate backup and restore	

Group: vGate	
License: AGPL-3.0	
URL: www.Halsign.com		

Requires: redis nodejs yarn	
BuildRequires: git

%description
vStorage package

%prep
%build


%install
echo Starting install section
rm -rf %{buildroot}
mkdir -p %{buildroot}/usr/lib/node_modules/vs-server
mkdir -p %{buildroot}/usr/lib/node_modules/vs-web
mkdir -p %{buildroot}/etc/systemd/system

rm -rf ~/vs-server
rm -rf ~/vs-web
git clone -b stable git:git@192.166.30.211:/data/git/vStorage/vs-server ~/vs-server
git clone -b stable git:git@192.166.30.211:/data/git/vStorage/vs-web ~/vs-web
cp ~/vs-server/sample.config.yaml ~/vs-server/.xo-server.yaml

cp -r  ~/vs-server/* %{buildroot}/usr/lib/node_modules/vs-server
cp  ~/vs-server/.xo-server.yaml %{buildroot}/usr/lib/node_modules/vs-server
cp  ~/vs-server/vs-server.service %{buildroot}/etc/systemd/system
cp -r  ~/vs-web/* %{buildroot}/usr/lib/node_modules/vs-web


%post
cd /usr/lib/node_modules/vs-web
yarn
cd /usr/lib/node_modules/vs-server
yarn
systemctl enable redis
systemctl start redis
systemctl enable vs-server.service
systemctl start vs-server.service

%files
%dir /usr/lib/node_modules/vs-server
%dir /usr/lib/node_modules/vs-web
/usr/lib/node_modules/vs-server/*
/usr/lib/node_modules/vs-server/.xo-server.yaml
/usr/lib/node_modules/vs-web/*
/etc/systemd/system/vs-server.service
%doc



%changelog

