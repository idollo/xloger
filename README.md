#WebJet使用说明
基于websocket的web消息推送组件.

##1. 授权握手
websocket使用的是持久连接, 系统的设备描述符有限, 所以我们不允许恶意的网络连接占用系统资源.

**1.1 回调URL**
默认为 /webjet/auth    
也就是要在同域名下创建接口, 如     
http://manager.diandao.org/webjet/auth
Webjet握手时, webjet服务会调用这个接口

**1.2 返回授权结果**
```php
#! WebjetController.class.php
use \Diandao\Webjet;

class WebjetController extends Controller {
    public function auth(){
        // 如果用户已登录, 授受连接
        // 如果是公网游客, 直接auth_accept() (游客在打开官网时, 客户端有权限且只能同时存在一个webjet连接)
        if($this->is_logined()){
            Webjet::auth_accept();
        }else{
            // 拒绝授权
            Webjet::auth_reject();
        }
    }
}
```
--------------
##2. 推送消息
**Webjet::emit($event, $data="", $blocking=false)**
向当前web会话中的用户推送事件消息, 默认为非堵塞模式, 非堵塞时没有返回值. 而在堵塞模式($blocking=true)时, 发送成功返回True, 发送失败返回False

**Webjet::publish($event, $data="", $blocking=false)**
广播事件消息给所有已连接的用户. 参数说明同 emit();

**绑定会话参数**
同域名项目下, 会话是同步的, 但有时候会跳转至第三方页面, 如支付页, 支付系统是无法还原之前会话的, 所以跳出本域名前, 记得拼接webjet会话参数, 如: 
```php
use \Diandao\Webjet;
// ...
$pay_url = "http://diandao.org/pay?oid=xxxx&jetid=".Webjet::jetid();
header("Location: $url");
```
跳出支付页的逻辑:
```php
#! pay.php
require "/phplibs/autoload.php"; # Diandao 模块autoload
use \Diandao\Webjet;

$jetid = $_REQUEST['fetid'];
Webjet::jetid($jetid); # 设置webjet会话
# 给目标用户发送消息
Webjet::emit("redirect", "http://diandao.org/pay/success?msg=支付成功";
```
-----------
##3. 监听消息事件
每个需要的域名项目将挂载 /webjet/ws 连接至web jet服务, 所以/webjet/ws将作为web端的web socket连接接口.
```html
<script src="//ddimg.net/js/socket.io.js"></script>
<script>
  var socket = io('/webjet/ws');
  socket.on('connect', function(){});
  // redirect 事件
  socket.on('redirect', function(url){
      location.href = url;
  });
  socket.on('disconnect', function(){});
</script>
```






