# -*- mode: ruby -*-
# vi: set ft=ruby :

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

  config.vm.box = "debian/jessie64"

  config.vm.define "arkivo" do |arkivo|
    arkivo.vm.network "forwarded_port", guest: 6379, host: 6379

    arkivo.vm.provision "shell", inline: "apt-get install --yes puppet"

    arkivo.vm.provision "puppet" do |puppet|
      puppet.manifests_path = "puppet/manifests"
      puppet.module_path = "puppet/modules"
      puppet.manifest_file  = "arkivo.pp"
    end
  end
end
