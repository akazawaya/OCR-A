from django.http import JsonResponse


def health_check(_request):
    # ALBが各EC2のDjangoプロセスまで応答可能かを確認する。
    # RedisやDB等のチェックはAWSの各リソースの監視に委ねる。
    # 正常時はJsonResponseのデフォルトでHTTP 200を返す。
    # 異常時は別の層で5xxが返り、接続拒否、タイムアウト等を基にALBが異常と判定する想定。
    return JsonResponse({"status": "ok"})
