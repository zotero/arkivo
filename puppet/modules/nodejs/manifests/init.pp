class nodejs(
  $user,
  $home        = "/home/${user}",
  $version     = '0.11.13'
){

  $NODE_PATH = "${home}/.nvm/v${version}/bin"
  $NODE_EXEC = "${NODE_PATH}/node"
  $NPM_EXEC = "${NODE_PATH}/npm"

  exec { 'nvm-install-script':
    command     => 'curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash',
    cwd         => $home,
    user        => $user,
    creates     => "${home}/.nvm/nvm.sh",
    environment => [ "HOME=${home}" ]
  }

  ~> exec { 'nvm-install-node':
    command     => ". ${home}/.nvm/nvm.sh && nvm install ${version}",
    cwd         => $home,
    user        => $user,
    unless      => "test -e ${home}/.nvm/v${version}/bin/node",
    provider    => shell,
    environment => [ "HOME=${home}", "NVM_DIR=${home}/.nvm" ]
  }

  ~> exec { 'nvm-activate-node':
    command     => ". ${home}/.nvm/nvm.sh && nvm alias default ${version}",
    cwd         => $home,
    user        => $user,
    provider    => shell,
    environment => [ "HOME=${home}", "NVM_DIR=${home}/.nvm" ]
  }
}
