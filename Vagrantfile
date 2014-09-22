# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

  config.vm.box = "debian74-puppet"
  # config.vm.box_url = "http://domain.com/path/to/above.box"

  config.vm.define "arkivo" do |arkivo|
    arkivo.vm.network "forwarded_port", guest: 6379, host: 6379

    arkivo.vm.provision "puppet" do |puppet|
      puppet.manifests_path = "puppet/manifests"
      puppet.module_path = "puppet/modules"
      puppet.manifest_file  = "arkivo.pp"
    end
  end

  config.vm.define "scholarsphere" do |ss|
    ss.vm.provision "puppet" do |puppet|
      puppet.manifests_path = "puppet/manifests"
      puppet.module_path = "puppet/modules"
      puppet.manifest_file  = "scholarsphere.pp"
    end
  end
end
